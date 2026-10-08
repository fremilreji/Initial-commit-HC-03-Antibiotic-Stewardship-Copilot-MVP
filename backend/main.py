import io
import json
import os
import re
from typing import Any, Dict

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Prescription Analysis API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are an expert medical data extraction AI. I will provide an image of a hospital prescription pad. 
Your task is to extract the clinical data and return it strictly as a JSON object. Do not include markdown formatting like ```json.

Extract the following fields:
1. "patient_age": (integer)
2. "patient_gender": (string)
3. "comorbidities": (list of strings, e.g., ["CKD Stage 3", "Diabetic"]. Empty list if none.)
4. "diagnosis": (string)
5. "investigations_ordered": (list of strings, e.g., ["Urine Routine", "CBC"]. Empty list if none.)
6. "culture_ordered": (boolean. True ONLY if "Blood Culture", "Urine Culture", or "ETA Culture" is explicitly written.)
7. "prescriptions": A list of objects, each containing:
   - "brand_name": (string, exactly as written)
   - "route": (string, e.g., "IV", "Oral")
   - "frequency": (string, e.g., "OD", "BD", "TDS")
   - "duration_days": (integer, calculate if written as a date range)

If any field is missing from the image, return null for that field."""


def evaluate_prescriptions(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Applies clinical benchmark checks and guideline rules to the extracted prescription data.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    brands_path = os.path.join(base_dir, "brands.json")
    benchmarks_path = os.path.join(base_dir, "benchmarks.json")

    with open(brands_path, "r", encoding="utf-8") as f:
        brands = json.load(f)

    with open(benchmarks_path, "r", encoding="utf-8") as f:
        benchmarks = json.load(f)

    diagnosis = data.get("diagnosis") or ""
    comorbidities = data.get("comorbidities") or []
    culture_ordered = bool(data.get("culture_ordered"))
    prescriptions = data.get("prescriptions") or []

    # Check comorbidities for CKD (case-insensitive substring)
    has_ckd = any("ckd" in str(c).lower() for c in comorbidities)

    # Check diagnosis for "Cystitis" or "UTI" (case-insensitive substring)
    diag_lower = diagnosis.lower()
    has_cystitis_or_uti = ("cystitis" in diag_lower) or ("uti" in diag_lower)

    for rx in prescriptions:
        brand_name = rx.get("brand_name") or ""
        duration_days = rx.get("duration_days")
        route = rx.get("route") or ""

        # Map brand_name to generic name using brands.json
        generic_name = None
        cleaned_brand = brand_name.strip()

        # 1. Exact or case-insensitive match
        for b_name, g_name in brands.items():
            if b_name.lower() == cleaned_brand.lower():
                generic_name = g_name
                break

        # 2. Word boundary match (e.g. "Augmentin 625mg" -> "Augmentin")
        if not generic_name:
            for b_name, g_name in brands.items():
                if re.search(r"\b" + re.escape(b_name) + r"\b", cleaned_brand, re.IGNORECASE):
                    generic_name = g_name
                    break

        # 3. Substring match
        if not generic_name:
            for b_name, g_name in brands.items():
                if b_name.lower() in cleaned_brand.lower():
                    generic_name = g_name
                    break

        # 4. Fallback if generic name is already directly written in prescription
        if not generic_name:
            for g_name in benchmarks.keys():
                if g_name.lower() in cleaned_brand.lower():
                    generic_name = g_name
                    break

        # Strict Antibiotic Whitelist Check:
        # If drug is NOT mapped to an antibiotic in brands.json / benchmarks.json,
        # completely BYPASS all stewardship checks (AWaRe, culture, duration, susceptibility).
        is_antibiotic = bool(generic_name and generic_name in benchmarks)

        if not is_antibiotic:
            rx["is_antibiotic"] = False
            rx["flags"] = ["NON-ANTIBIOTIC: Bypass stewardship checks"]
            rx["step_down_alternative"] = None
            continue

        rx["is_antibiotic"] = True
        flags = []
        step_down_alt = None

        benchmark = benchmarks[generic_name]
        aware_class = benchmark.get("aware_class", "")
        max_duration_days = benchmark.get("max_duration_days")
        requires_culture = benchmark.get("requires_culture", False)
        renal_dose_adjustment_required = benchmark.get("renal_dose_adjustment_required", False)
        step_down_alt = benchmark.get("step_down_alternative")

        # Flag 1: If duration_days > max_duration_days
        if duration_days is not None and max_duration_days is not None:
            try:
                if int(duration_days) > int(max_duration_days):
                    flags.append("DURATION_EXCEEDS_LOCAL_DEFAULT")
            except (ValueError, TypeError):
                pass

        # Flag 2: If requires_culture is true but culture_ordered is false
        if requires_culture and not culture_ordered:
            flags.append("CULTURE_REQUIRED_BEFORE_OR_AT_START")

        # Flag 3: If aware_class is "Reserve"
        if aware_class == "Reserve":
            flags.append("RESERVE_AGENT_REQUIRES_JUSTIFICATION")

        # Flag 4: If route is "IV", aware_class is "Watch", and diagnosis contains "Cystitis" or "UTI"
        if "IV" in route.upper() and aware_class == "Watch" and has_cystitis_or_uti:
            flags.append("ROUTE_ERROR: IV therapy prescribed for stable outpatient.")

        # Flag 5: If comorbidities contains "CKD" and renal_dose_adjustment_required is true
        if has_ckd and renal_dose_adjustment_required:
            flags.append("RENAL_TOXICITY_ALERT")

        rx["flags"] = flags
        rx["step_down_alternative"] = step_down_alt

    return data


@app.post("/api/analyze-prescription")
async def analyze_prescription(file: UploadFile = File(...)) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured. Please set the GEMINI_API_KEY or GOOGLE_API_KEY environment variable.",
        )

    client = genai.Client(api_key=api_key)

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Try opening with PIL to validate standard image formats
        try:
            image_input = Image.open(io.BytesIO(contents))
        except Exception:
            # Fallback to Part for direct binary formats
            image_input = types.Part.from_bytes(
                data=contents,
                mime_type=file.content_type or "image/jpeg",
            )

        candidate_models = [
            os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
        ]
        candidate_models = list(dict.fromkeys(candidate_models))

        response = None
        last_error = None

        for model_candidate in candidate_models:
            for attempt in range(2):
                try:
                    response = client.models.generate_content(
                        model=model_candidate,
                        contents=[
                            image_input,
                            "Extract the clinical data from this prescription image strictly adhering to the schema and instructions provided.",
                        ],
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            response_mime_type="application/json",
                        ),
                    )
                    if response and response.text:
                        break
                except Exception as exc:
                    last_error = exc
                    err_msg = str(exc).lower()
                    if "503" in err_msg or "unavailable" in err_msg or "429" in err_msg or "resource_exhausted" in err_msg:
                        import time
                        time.sleep(0.5)
                        continue
                    else:
                        break
            if response and response.text:
                break

        if not response or not response.text:
            raise HTTPException(
                status_code=503,
                detail=f"All candidate models are temporarily unavailable: {last_error}",
            )

        raw_text = response.text.strip()

        # Remove markdown code block fences if present
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)

        parsed_json = json.loads(raw_text)

        # Apply clinical benchmarks and generate alert flags
        enriched_data = evaluate_prescriptions(parsed_json)
        return enriched_data

    except json.JSONDecodeError as jde:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse model response into JSON: {str(jde)}. Raw output: {raw_text}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while analyzing the prescription: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    # Bind strictly to 127.0.0.1 (localhost) so only this machine can connect
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
