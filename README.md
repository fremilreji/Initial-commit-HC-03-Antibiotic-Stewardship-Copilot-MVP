# attend.to — Antibiotic Stewardship Copilot (CDSS)

> **Healthcare AI / Antimicrobial Resistance (AMR) / Clinical Decision Support System (CDSS)**  
> Built for hospital clinical pharmacists to audit inpatient and outpatient antibiotic prescriptions against local antibiograms, WHO AWaRe guidelines, and ICMR protocols before drugs are dispensed.

---

## 👥 Core Contributors & Project Team

| Contributor | GitHub Handle | Role & Domain | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Fremil Reji** | [@fremilreji](https://github.com/fremilreji) | Team Lead & Lead Architect | System integration, AI pipeline, and deployment |
| **Shivani** | [@20babushivani-wq](https://github.com/20babushivani-wq) | Frontend Lead | Next.js UI, Stewardship Desk dashboard, interactive components |
| **Vaishnavi** | [@vaishnavikc0194-ux](https://github.com/vaishnavikc0194-ux) | Backend & Data Engineer | FastAPI REST API, deterministic clinical engine, benchmarks mapping |
| **Nakshatra** | [@Nakshatra-29](https://github.com/Nakshatra-29) | QA & Clinical Assets | Clinical test cases, ICMR guideline mapping, demo workflows |

---

## 📁 Unified Project Structure

All files for the frontend, backend, rules engine, datasets, and launcher scripts are consolidated inside this single repository:

```text
E:\antibiotic-stewardship-tool/
├── backend/                       # Python FastAPI Backend & Deterministic Rules Engine
│   ├── main.py                    # API routes & OCR extraction & deterministic audit logic
│   ├── brands.json                # Indian commercial brand-to-generic antibiotic mapping
│   ├── benchmarks.json            # WHO AWaRe benchmarks, max duration, cultures, oral step-downs
│   ├── requirements.txt           # Python dependencies (fastapi, uvicorn, google-genai, etc.)
│   └── .env                       # Local environment variables & Gemini API key (git-ignored)
│
├── app/                           # Next.js App Router (Layout & Root Page)
│   ├── globals.css                # Tailwind CSS & theme tokens
│   ├── layout.tsx                 # Root layout with Toast notification provider
│   └── page.tsx                   # Main dashboard view
│
├── components/                    # UI Components Layer
│   ├── stewardship/
│   │   ├── stewardship-app.tsx    # Core desktop layout & triage state coordinator
│   │   ├── app-header.tsx         # Header bar with navigation, CSV bulk upload & new Rx
│   │   ├── flag-summary.tsx       # Real-time reactive KPI summary cards
│   │   ├── review-queue.tsx       # Prioritized triage list (Needs Review vs. Decided)
│   │   ├── review-detail.tsx      # Prescription detail, Safety Checkpoint, flags, citations
│   │   ├── upload-dialog.tsx      # Dual intake modal (AI Vision scan & batch CSV upload)
│   │   ├── antibiogram-view.tsx   # Hospital antibiogram resistance table
│   │   └── guidelines-view.tsx    # ICMR clinical syndromic guidelines viewer
│   └── ui/                        # Reusable Tailwind UI primitives (buttons, badges, modals, toasts)
│
├── lib/                           # Logic & Data Utilities
│   └── stewardship/
│       ├── ai-mapper.ts           # Maps FastAPI Gemini response to frontend state
│       ├── engine.ts              # Client-side validation & guideline checks
│       ├── data.ts                # Hospital antibiogram & ICMR guideline constants
│       ├── csv.ts                 # Batch CSV parser & template generator
│       ├── types.ts               # TypeScript data definitions & domain interfaces
│       └── meta.ts                # Category colors, severity badges, and decision metadata
│
├── requirements.txt               # Root Python requirements
├── package.json                   # Node.js dependencies & scripts
├── start-servers.bat              # 1-Click Launcher (starts FastAPI & Next.js in parallel)
└── README.md                      # Project documentation & mentor guide
```

---

## ⚡ Quick Start (Run Both Servers)

### Option 1: 1-Click Launcher
Double-click `start-servers.bat` in the root folder. It starts both the FastAPI backend and Next.js frontend in separate terminal windows automatically.

### Option 2: Manual Terminal Commands
1. **Start the FastAPI Backend:**
   ```powershell
   cd backend
   py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
2. **Start the Next.js Frontend:**
   ```powershell
   npm.cmd run dev
   ```
3. Open your browser at **`http://localhost:3000`**.

---

## 🛡️ Core Architecture: "AI Extracts; Deterministic Rules Decide"

1. **AI Vision Layer (OCR Only):** Google Gemini Vision parses handwritten or digital prescription scans into structured JSON (`patient_age`, `patient_gender`, `diagnosis`, `prescriptions`, `culture_ordered`). It makes **zero** clinical decisions.
2. **Deterministic Rules Engine (`backend/main.py`):** 
   - Evaluates generic molecules against [`backend/benchmarks.json`](backend/benchmarks.json).
   - Flags inappropriate IV routes for stable outpatients (e.g. IV Ceftriaxone for cystitis).
   - Enforces microbiology cultures before starting Watch/Reserve class antibiotics.
   - Recommends safer, cost-effective oral step-down regimens.
3. **Antibiotic Whitelist Check:** Non-antimicrobial drugs (such as Lisinopril, Amlodipine, Metformin) automatically bypass stewardship checks with a clean blue badge and zero red flags.
4. **Safety Checkpoint (Human-in-the-Loop):** Pharmacists verify the OCR extraction against the physical prescription pad via the **"Verify Extracted Text: Matches Physical Prescription"** button before clinical rules unlock.
5. **Data Citations:** Explicitly references **ICMR Antimicrobial Guidelines 2024** and simulated hospital antibiogram records.
6. **Token-Optimized Perception Layer:** In-memory PIL downscaling to $\le 1024\text{px}$ reduces Gemini vision tiling from ~1,600 down to ~258 tokens (75%+ token savings).
7. **Zero-Token Batch CSV API (`/api/analyze-csv`):** Ingests and evaluates hospital EHR batch CSV files using local deterministic Python rules at **0 token cost**.
8. **Health Monitoring Endpoint (`/api/health`):** Real-time status reporting loaded brand mappings (62) and clinical benchmarks (21).