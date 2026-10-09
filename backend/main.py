import csv
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

app = FastAPI(title="Attend.to — Prescription Analysis API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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

# ── Load reference data once at startup (not on every request) ──
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(_BASE_DIR, "brands.json"), "r", encoding="utf-8") as _f:
    BRANDS = json.load(_f)

with open(os.path.join(_BASE_DIR, "benchmarks.json"), "r", encoding="utf-8") as _f:
    BENCHMARKS = json.load(_f)


def evaluate_prescriptions(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Applies clinical benchmark checks and guideline rules to the extracted prescription data.
    Uses module-level cached BRANDS and BENCHMARKS dicts (loaded once at startup).
    """
    brands = BRANDS
    benchmarks = BENCHMARKS

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


@app.get("/api/health")
async def health_check():
    """Quick health check endpoint — returns system status and loaded data counts."""
    return {
        "status": "ok",
        "engine": "Attend.to Antibiotic Stewardship Copilot",
        "brands_loaded": len(BRANDS),
        "benchmarks_loaded": len(BENCHMARKS),
        "gemini_key_configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
    }


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

        # Try opening with PIL and optimize dimensions for minimum token consumption
        try:
            image_input = Image.open(io.BytesIO(contents))
            # Convert RGBA/P to RGB if necessary for safe encoding
            if image_input.mode in ("RGBA", "P"):
                image_input = image_input.convert("RGB")
            # Downscale large smartphone photos (e.g. 4000x3000) to max 1024px
            # This reduces Gemini vision tile tokens from ~1,600 down to ~258 tokens (75%+ token savings)
            if hasattr(image_input, "width") and hasattr(image_input, "height"):
                if image_input.width > 1024 or image_input.height > 1024:
                    image_input.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        except Exception:
            # Fallback to Part for direct binary formats
            image_input = types.Part.from_bytes(
                data=contents,
                mime_type=file.content_type or "image/jpeg",
            )

        candidate_models = [
            os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
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

        # Robust JSON extraction: strip markdown fences anywhere in response
        raw_text = re.sub(r"```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```", "", raw_text).strip()

        # Try direct parse first; fallback to regex extraction of first JSON object
        try:
            parsed_json = json.loads(raw_text)
        except json.JSONDecodeError:
            match = re.search(r"(\{.*\}|\[.*\])", raw_text, re.DOTALL)
            if match:
                parsed_json = json.loads(match.group(1))
            else:
                raise

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


@app.post("/api/analyze-csv")
async def analyze_csv(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Ingests structured hospital prescription CSV files at ZERO token cost.
    Bypasses Vision AI and directly executes local deterministic clinical rules.
    """
    try:
        contents = await file.read()
        text = contents.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        
        batch_records = []
        for row in reader:
            cleaned_row = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}
            
            age_str = cleaned_row.get("age") or cleaned_row.get("patient_age") or "0"
            try:
                age = int(re.sub(r"\D", "", age_str)) if re.sub(r"\D", "", age_str) else None
            except Exception:
                age = None

            gender = cleaned_row.get("gender") or cleaned_row.get("patient_gender") or None
            diagnosis = cleaned_row.get("diagnosis") or ""
            comorbidities_raw = cleaned_row.get("comorbidities") or cleaned_row.get("comorbidity") or ""
            comorbidities = [c.strip() for c in re.split(r"[,;|]", comorbidities_raw) if c.strip()]
            
            culture_raw = cleaned_row.get("culture_ordered") or cleaned_row.get("culture") or "false"
            culture_ordered = culture_raw.lower() in ("true", "1", "yes", "y")
            
            brand_name = cleaned_row.get("brand_name") or cleaned_row.get("drug") or cleaned_row.get("antibiotic") or ""
            route = cleaned_row.get("route") or "Oral"
            frequency = cleaned_row.get("frequency") or "BD"
            duration_str = cleaned_row.get("duration_days") or cleaned_row.get("duration") or "5"
            try:
                # Use float parsing first to handle decimals like "5.5" correctly
                duration_days = int(round(float(re.search(r"[\d.]+", duration_str).group()))) if re.search(r"[\d.]+", duration_str) else 5
            except Exception:
                duration_days = 5

            patient_data = {
                "patient_age": age,
                "patient_gender": gender,
                "diagnosis": diagnosis,
                "comorbidities": comorbidities,
                "investigations_ordered": [],
                "culture_ordered": culture_ordered,
                "prescriptions": [
                    {
                        "brand_name": brand_name,
                        "route": route,
                        "frequency": frequency,
                        "duration_days": duration_days,
                    }
                ]
            }
            
            enriched = evaluate_prescriptions(patient_data)
            batch_records.append(enriched)
            
        return {
            "status": "success",
            "total_processed": len(batch_records),
            "token_cost": 0,
            "engine": "Deterministic Local Python Rules Engine (ICMR 2024)",
            "records": batch_records
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    # Bind to 0.0.0.0 so teammates on Wi-Fi or hotspot can connect to this server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
