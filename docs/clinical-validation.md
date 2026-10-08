# Clinical Validation & Benchmark Test Cases

**Domain:** Clinical Decision Support System (CDSS) for Antibiotic Stewardship  
**Lead Evaluator:** Nakshatra ([@Nakshatra-29](https://github.com/Nakshatra-29))  
**Guidelines Reference:** ICMR 2024 & WHO AWaRe (Access, Watch, Reserve)

---

## 1. Test Case Matrix

### Test Case 1: Outpatient Uncomplicated Cystitis (Route Error & Culture Missing)
* **Prescription:** Inj. Monocef (Ceftriaxone) 1g IV OD $\times$ 5 days
* **Diagnosis:** Acute Uncomplicated Cystitis (28y Female)
* **Expected Deterministic Flags:**
  - `ROUTE_ERROR: IV therapy prescribed for stable outpatient.`
  - `CULTURE_REQUIRED_BEFORE_OR_AT_START`
* **Guideline Alternative:** Oral Amoxicillin-Clavulanate or Nitrofurantoin 100mg BD $\times$ 5 days
* **Validation Outcome:** PASS

---

### Test Case 2: Inappropriate Duration for Mild Infection
* **Prescription:** Tab. Augmentin 625mg PO BD $\times$ 10 days
* **Diagnosis:** Uncomplicated UTI (45y Female)
* **Expected Deterministic Flags:**
  - `DURATION_EXCEEDS_LOCAL_DEFAULT` (Max recommended: 5 days)
* **Guideline Alternative:** Reduce course to 5 days
* **Validation Outcome:** PASS

---

### Test Case 3: Renal Toxicity Alert in CKD Stage 3
* **Prescription:** Inj. Meronem (Meropenem) 1g IV TDS $\times$ 10 days
* **Diagnosis:** Hospital-Acquired Pneumonia with CKD (eGFR 28 mL/min)
* **Expected Deterministic Flags:**
  - `RENAL_TOXICITY_ALERT`
  - `CULTURE_REQUIRED_BEFORE_OR_AT_START`
* **Guideline Alternative:** Dose-adjusted Meropenem (1g q12h) or Piperacillin-Tazobactam
* **Validation Outcome:** PASS

---

### Test Case 4: Non-Antibiotic Whitelist Bypass (Lisinopril)
* **Prescription:** Tab. Lisinopril 10mg PO OD $\times$ 30 days
* **Diagnosis:** Essential Hypertension
* **Expected Deterministic Flags:**
  - `NON-ANTIBIOTIC: Bypass stewardship checks`
* **Stewardship Action:** All AWaRe, culture, and duration checks bypassed
* **Validation Outcome:** PASS
