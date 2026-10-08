import type { Drug, Guideline, Prescription } from './types'

export const ANTIBIOGRAM_PERIOD = 'Jan – Jun 2026'
export const SUSCEPTIBILITY_TARGET = 80

export const DRUGS: Record<string, Drug> = {
  amoxicillin: { key: 'amoxicillin', name: 'Amoxicillin', drugClass: 'Penicillin', aware: 'Access', family: 'penicillin', doseBasis: 'mg', minDaily: 1500, maxDaily: 3000 },
  amox_clav: {
    key: 'amox_clav', name: 'Amoxicillin-clavulanate', drugClass: 'Penicillin + BLI', aware: 'Access', family: 'penicillin', doseBasis: 'mg', minDaily: 1875, maxDaily: 3600,
    renal: { crClBelow: 30, adjusted: { dose: 1200, frequency: 2 }, note: 'CrCl < 30: reduce to 1.2 g q12h.' },
  },
  cefazolin: {
    key: 'cefazolin', name: 'Cefazolin', drugClass: '1st-gen cephalosporin', aware: 'Access', family: 'cephalosporin', doseBasis: 'mg', minDaily: 1000, maxDaily: 6000,
    renal: { crClBelow: 35, adjusted: { dose: 2000, frequency: 2 }, note: 'CrCl < 35: extend to q12h.' },
  },
  ceftriaxone: { key: 'ceftriaxone', name: 'Ceftriaxone', drugClass: '3rd-gen cephalosporin', aware: 'Watch', family: 'cephalosporin', doseBasis: 'mg', minDaily: 1000, maxDaily: 4000 },
  azithromycin: { key: 'azithromycin', name: 'Azithromycin', drugClass: 'Macrolide', aware: 'Watch', family: 'other', doseBasis: 'mg', minDaily: 250, maxDaily: 1000 },
  ciprofloxacin: {
    key: 'ciprofloxacin', name: 'Ciprofloxacin', drugClass: 'Fluoroquinolone', aware: 'Watch', family: 'other', doseBasis: 'mg', minDaily: 500, maxDaily: 1500,
    renal: { crClBelow: 30, adjusted: { dose: 500, frequency: 1 }, note: 'CrCl < 30: 500 mg once daily.' },
  },
  nitrofurantoin: {
    key: 'nitrofurantoin', name: 'Nitrofurantoin', drugClass: 'Nitrofuran', aware: 'Access', family: 'other', doseBasis: 'mg', minDaily: 200, maxDaily: 400,
    renal: { crClBelow: 45, contraindicated: true, note: 'Avoid when CrCl < 45 mL/min — inadequate urinary levels, toxicity risk.' },
  },
  fosfomycin: { key: 'fosfomycin', name: 'Fosfomycin', drugClass: 'Phosphonic acid', aware: 'Watch', family: 'other', doseBasis: 'mg', minDaily: 3000, maxDaily: 3000 },
  pip_taz: {
    key: 'pip_taz', name: 'Piperacillin-tazobactam', drugClass: 'Penicillin + BLI', aware: 'Watch', family: 'penicillin', doseBasis: 'mg', minDaily: 9000, maxDaily: 18000,
    renal: { crClBelow: 40, adjusted: { dose: 4500, frequency: 3 }, note: 'CrCl < 40: 4.5 g q8h.' },
  },
  meropenem: {
    key: 'meropenem', name: 'Meropenem', drugClass: 'Carbapenem', aware: 'Watch', family: 'carbapenem', doseBasis: 'mg', minDaily: 1500, maxDaily: 6000,
    renal: { crClBelow: 50, adjusted: { dose: 1000, frequency: 2 }, note: 'CrCl 26–50: 1 g q12h.' },
  },
  amikacin: {
    key: 'amikacin', name: 'Amikacin', drugClass: 'Aminoglycoside', aware: 'Access', family: 'other', doseBasis: 'mgPerKg', minDaily: 15, maxDaily: 20,
    renal: { crClBelow: 30, contraindicated: true, note: 'Avoid aminoglycosides when CrCl < 30 mL/min unless no alternative; requires TDM.' },
  },
  caz_avi: {
    key: 'caz_avi', name: 'Ceftazidime-avibactam', drugClass: 'Cephalosporin + BLI', aware: 'Reserve', family: 'cephalosporin', doseBasis: 'mg', minDaily: 7500, maxDaily: 7500,
    renal: { crClBelow: 50, adjusted: { dose: 1250, frequency: 3 }, note: 'CrCl 31–50: 1.25 g q8h.' },
  },
  doxycycline: { key: 'doxycycline', name: 'Doxycycline', drugClass: 'Tetracycline', aware: 'Access', family: 'other', doseBasis: 'mg', minDaily: 200, maxDaily: 200 },
  cloxacillin: { key: 'cloxacillin', name: 'Cloxacillin', drugClass: 'Anti-staphylococcal penicillin', aware: 'Access', family: 'penicillin', doseBasis: 'mg', minDaily: 2000, maxDaily: 12000 },
  metronidazole: { key: 'metronidazole', name: 'Metronidazole', drugClass: 'Nitroimidazole', aware: 'Access', family: 'other', doseBasis: 'mg', minDaily: 1200, maxDaily: 4000 },
  vancomycin: { key: 'vancomycin', name: 'Vancomycin', drugClass: 'Glycopeptide', aware: 'Watch', family: 'other', doseBasis: 'mgPerKg', minDaily: 25, maxDaily: 45 },
  linezolid: { key: 'linezolid', name: 'Linezolid', drugClass: 'Oxazolidinone', aware: 'Reserve', family: 'other', doseBasis: 'mg', minDaily: 1200, maxDaily: 1200 },
}

export const ORGANISMS = [
  'E. coli',
  'K. pneumoniae',
  'P. aeruginosa',
  'A. baumannii',
  'S. aureus',
  'S. pyogenes',
  'S. pneumoniae',
  'S. Typhi',
] as const

export const ANTIBIOGRAM_DRUGS = [
  'amox_clav', 'ceftriaxone', 'ciprofloxacin', 'nitrofurantoin', 'fosfomycin', 'pip_taz', 'meropenem', 'amikacin', 'caz_avi',
  'cefazolin', 'cloxacillin', 'doxycycline', 'azithromycin', 'vancomycin', 'linezolid',
]

export const ISOLATE_COUNTS: Record<string, number> = {
  'E. coli': 1284, 'K. pneumoniae': 862, 'P. aeruginosa': 411, 'A. baumannii': 296,
  'S. aureus': 538, 'S. pyogenes': 74, 'S. pneumoniae': 88, 'S. Typhi': 132,
}

export const ANTIBIOGRAM: Record<string, Partial<Record<string, number>>> = {
  'E. coli': { amox_clav: 38, ceftriaxone: 27, ciprofloxacin: 22, nitrofurantoin: 89, fosfomycin: 94, pip_taz: 61, meropenem: 84, amikacin: 86, caz_avi: 92 },
  'K. pneumoniae': { amox_clav: 20, ceftriaxone: 18, ciprofloxacin: 19, nitrofurantoin: 45, fosfomycin: 70, pip_taz: 38, meropenem: 52, amikacin: 58, caz_avi: 81 },
  'P. aeruginosa': { ciprofloxacin: 58, pip_taz: 72, meropenem: 64, amikacin: 76, caz_avi: 85 },
  'A. baumannii': { ciprofloxacin: 10, pip_taz: 12, meropenem: 14, amikacin: 21, caz_avi: 0 },
  'S. aureus': { amox_clav: 58, cefazolin: 58, cloxacillin: 58, ciprofloxacin: 30, doxycycline: 82, vancomycin: 100, linezolid: 100 },
  'S. pyogenes': { amox_clav: 100, cefazolin: 100, cloxacillin: 100, doxycycline: 75, azithromycin: 68 },
  'S. pneumoniae': { amox_clav: 94, ceftriaxone: 95, azithromycin: 52, doxycycline: 70 },
  'S. Typhi': { ceftriaxone: 97, azithromycin: 93, ciprofloxacin: 6 },
}

export const GUIDELINES: Record<string, Guideline> = {
  cap_ward: {
    key: 'cap_ward',
    name: 'Community-acquired pneumonia (ward)',
    likelyOrganisms: [{ organism: 'S. pneumoniae', weight: 1 }],
    options: [
      { drug: 'amox_clav', dose: 1200, frequency: 3, route: 'IV', durationDays: 5, firstLine: true },
      { drug: 'ceftriaxone', dose: 2000, frequency: 1, route: 'IV', durationDays: 5 },
      { drug: 'doxycycline', dose: 100, frequency: 2, route: 'PO', durationDays: 5, note: 'Penicillin allergy' },
      { drug: 'azithromycin', dose: 500, frequency: 1, route: 'PO', durationDays: 3, addOn: true, note: 'Add to beta-lactam for atypical cover' },
    ],
    duration: { min: 5, max: 7 },
    culture: { required: true, specimen: 'blood culture and sputum' },
    notes: 'Review at 48–72 h; switch IV to oral once afebrile and haemodynamically stable.',
  },
  uti_uncomplicated: {
    key: 'uti_uncomplicated',
    name: 'Uncomplicated cystitis',
    likelyOrganisms: [{ organism: 'E. coli', weight: 0.85 }, { organism: 'K. pneumoniae', weight: 0.15 }],
    options: [
      { drug: 'nitrofurantoin', dose: 100, frequency: 2, route: 'PO', durationDays: 5, firstLine: true },
      { drug: 'fosfomycin', dose: 3000, frequency: 1, route: 'PO', durationDays: 1, note: 'Single dose' },
    ],
    duration: { min: 3, max: 5 },
    culture: { required: true, specimen: 'urine culture' },
    notes: 'Fluoroquinolones and 3rd-gen cephalosporins are not recommended due to high local ESBL rates.',
  },
  uti_complicated: {
    key: 'uti_complicated',
    name: 'Complicated UTI / pyelonephritis',
    likelyOrganisms: [{ organism: 'E. coli', weight: 0.8 }, { organism: 'K. pneumoniae', weight: 0.2 }],
    options: [
      { drug: 'amikacin', dose: 15, frequency: 1, route: 'IV', durationDays: 7, firstLine: true },
      { drug: 'meropenem', dose: 1000, frequency: 3, route: 'IV', durationDays: 7, note: 'Septic shock or ESBL with AKI' },
      { drug: 'pip_taz', dose: 4500, frequency: 4, route: 'IV', durationDays: 7 },
    ],
    duration: { min: 7, max: 10 },
    culture: { required: true, specimen: 'urine and blood cultures' },
    notes: 'De-escalate to an oral agent per culture result once afebrile for 48 h.',
  },
  sepsis_hai: {
    key: 'sepsis_hai',
    name: 'Hospital-acquired sepsis (ICU)',
    likelyOrganisms: [
      { organism: 'E. coli', weight: 0.35 }, { organism: 'K. pneumoniae', weight: 0.35 },
      { organism: 'P. aeruginosa', weight: 0.2 }, { organism: 'A. baumannii', weight: 0.1 },
    ],
    options: [
      { drug: 'meropenem', dose: 1000, frequency: 3, route: 'IV', durationDays: 7, firstLine: true },
      { drug: 'pip_taz', dose: 4500, frequency: 4, route: 'IV', durationDays: 7 },
      { drug: 'caz_avi', dose: 2500, frequency: 3, route: 'IV', durationDays: 7, requiresApproval: true, note: 'Only for confirmed CRE; ID approval' },
    ],
    duration: { min: 7, max: 14 },
    culture: { required: true, specimen: 'two sets of blood cultures plus source cultures' },
    notes: 'Cultures before first dose. Reassess at 48–72 h and de-escalate on susceptibility report.',
  },
  surgical_prophylaxis: {
    key: 'surgical_prophylaxis',
    name: 'Surgical prophylaxis (clean / clean-contaminated)',
    skipCoverage: true,
    likelyOrganisms: [{ organism: 'S. aureus', weight: 1 }],
    options: [{ drug: 'cefazolin', dose: 2000, frequency: 1, route: 'IV', durationDays: 1, firstLine: true, note: 'Within 60 min before incision' }],
    duration: { min: 1, max: 1 },
    culture: { required: false, specimen: 'none' },
    notes: 'Single pre-incision dose; extending beyond 24 h does not reduce SSI and drives resistance.',
  },
  cellulitis: {
    key: 'cellulitis',
    name: 'Cellulitis (non-purulent)',
    likelyOrganisms: [{ organism: 'S. pyogenes', weight: 0.6 }, { organism: 'S. aureus', weight: 0.4 }],
    options: [
      { drug: 'cefazolin', dose: 2000, frequency: 3, route: 'IV', durationDays: 5, firstLine: true },
      { drug: 'cloxacillin', dose: 2000, frequency: 4, route: 'IV', durationDays: 5 },
      { drug: 'doxycycline', dose: 100, frequency: 2, route: 'PO', durationDays: 5, note: 'Suspected MRSA / severe beta-lactam allergy' },
    ],
    duration: { min: 5, max: 7 },
    culture: { required: false, specimen: 'pus swab if purulent' },
    notes: 'Mark the margin; 5 days is sufficient if improving.',
  },
  enteric_fever: {
    key: 'enteric_fever',
    name: 'Enteric fever',
    likelyOrganisms: [{ organism: 'S. Typhi', weight: 1 }],
    options: [
      { drug: 'ceftriaxone', dose: 2000, frequency: 1, route: 'IV', durationDays: 10, firstLine: true },
      { drug: 'azithromycin', dose: 1000, frequency: 1, route: 'PO', durationDays: 7, note: 'Uncomplicated, oral' },
    ],
    duration: { min: 7, max: 14 },
    culture: { required: true, specimen: 'blood culture' },
    notes: 'Fluoroquinolones are not recommended — local S. Typhi ciprofloxacin susceptibility is very low.',
  },
  urti: {
    key: 'urti',
    name: 'Viral upper respiratory tract infection',
    noAntibiotic: true,
    likelyOrganisms: [],
    options: [],
    duration: { min: 0, max: 0 },
    culture: { required: false, specimen: 'none' },
    notes: 'Antibiotics are not indicated. Symptomatic care; review if not improving in 7–10 days.',
  },
  acute_diarrhoea: {
    key: 'acute_diarrhoea',
    name: 'Acute watery diarrhoea',
    noAntibiotic: true,
    likelyOrganisms: [],
    options: [],
    duration: { min: 0, max: 0 },
    culture: { required: false, specimen: 'none' },
    notes: 'ORS and zinc. Antibiotics only for dysentery, cholera or suspected sepsis.',
  },
}

export const SEED_PRESCRIPTIONS: Prescription[] = [
  { id: 'RX-24101', patientName: 'Ramesh Kumar', uhid: 'UH-882031', age: 58, sex: 'M', weightKg: 68, ward: 'Medicine – Ward 4', prescriber: 'Dr. A. Rao', indication: 'cap_ward', drug: 'ceftriaxone', dose: 1000, frequency: 2, route: 'IV', durationDays: 10, cultureSent: false, crCl: 72, allergies: [], organism: null, prescribedAt: '2026-10-08T08:12:00' },
  { id: 'RX-24102', patientName: 'Sunita Devi', uhid: 'UH-882119', age: 34, sex: 'F', weightKg: 55, ward: 'Gynaecology OPD', prescriber: 'Dr. K. Menon', indication: 'uti_uncomplicated', drug: 'ciprofloxacin', dose: 500, frequency: 2, route: 'PO', durationDays: 7, cultureSent: false, crCl: 98, allergies: [], organism: null, prescribedAt: '2026-10-08T08:40:00' },
  { id: 'RX-24103', patientName: 'Arjun Mehta', uhid: 'UH-882204', age: 26, sex: 'M', weightKg: 70, ward: 'General OPD', prescriber: 'Dr. S. Bhat', indication: 'urti', drug: 'azithromycin', dose: 500, frequency: 1, route: 'PO', durationDays: 3, cultureSent: false, crCl: null, allergies: [], organism: null, prescribedAt: '2026-10-08T09:02:00' },
  { id: 'RX-24104', patientName: 'Lakshmi Narayan', uhid: 'UH-881456', age: 67, sex: 'F', weightKg: 52, ward: 'MICU', prescriber: 'Dr. P. Kulkarni', indication: 'sepsis_hai', drug: 'meropenem', dose: 1000, frequency: 3, route: 'IV', durationDays: 7, cultureSent: true, crCl: 32, allergies: [], organism: null, prescribedAt: '2026-10-08T09:15:00' },
  { id: 'RX-24105', patientName: 'Mohammed Irfan', uhid: 'UH-882310', age: 45, sex: 'M', weightKg: 80, ward: 'Surgery – OT 2', prescriber: 'Dr. R. Iyer', indication: 'surgical_prophylaxis', drug: 'ceftriaxone', dose: 1000, frequency: 1, route: 'IV', durationDays: 5, cultureSent: false, crCl: 90, allergies: [], organism: null, prescribedAt: '2026-10-08T09:30:00' },
  { id: 'RX-24106', patientName: 'Priya Sharma', uhid: 'UH-882377', age: 29, sex: 'F', weightKg: 60, ward: 'Medicine – Ward 2', prescriber: 'Dr. A. Rao', indication: 'enteric_fever', drug: 'ceftriaxone', dose: 2000, frequency: 1, route: 'IV', durationDays: 14, cultureSent: true, crCl: 105, allergies: [], organism: 'S. Typhi', prescribedAt: '2026-10-08T09:48:00' },
  { id: 'RX-24107', patientName: 'Gopal Rao', uhid: 'UH-880912', age: 72, sex: 'M', weightKg: 64, ward: 'Medicine – Ward 4', prescriber: 'Dr. N. Pillai', indication: 'uti_complicated', drug: 'nitrofurantoin', dose: 100, frequency: 2, route: 'PO', durationDays: 7, cultureSent: true, crCl: 24, allergies: [], organism: 'E. coli', prescribedAt: '2026-10-08T10:05:00' },
  { id: 'RX-24108', patientName: 'Anita Joseph', uhid: 'UH-882455', age: 41, sex: 'F', weightKg: 58, ward: 'Medicine – Ward 2', prescriber: 'Dr. S. Bhat', indication: 'cellulitis', drug: 'cloxacillin', dose: 500, frequency: 4, route: 'PO', durationDays: 7, cultureSent: false, crCl: 88, allergies: ['penicillin'], organism: null, prescribedAt: '2026-10-08T10:20:00' },
  { id: 'RX-24109', patientName: 'Vikram Singh', uhid: 'UH-881733', age: 52, sex: 'M', weightKg: 75, ward: 'SICU', prescriber: 'Dr. T. Das', indication: 'sepsis_hai', drug: 'caz_avi', dose: 2500, frequency: 3, route: 'IV', durationDays: 10, cultureSent: false, crCl: 80, allergies: [], organism: null, prescribedAt: '2026-10-08T10:42:00' },
  { id: 'RX-24110', patientName: 'Fatima Begum', uhid: 'UH-882501', age: 63, sex: 'F', weightKg: 50, ward: 'Medicine – Ward 4', prescriber: 'Dr. A. Rao', indication: 'cap_ward', drug: 'amox_clav', dose: 1200, frequency: 3, route: 'IV', durationDays: 5, cultureSent: true, crCl: 58, allergies: [], organism: null, prescribedAt: '2026-10-08T11:00:00' },
  { id: 'RX-24111', patientName: 'Suresh Patil', uhid: 'UH-882540', age: 38, sex: 'M', weightKg: 70, ward: 'Surgery – Ward 6', prescriber: 'Dr. R. Iyer', indication: 'cellulitis', drug: 'cefazolin', dose: 500, frequency: 3, route: 'IV', durationDays: 5, cultureSent: false, crCl: 95, allergies: [], organism: null, prescribedAt: '2026-10-08T11:18:00' },
  { id: 'RX-24112', patientName: 'Kavita Iyer', uhid: 'UH-882588', age: 55, sex: 'F', weightKg: 62, ward: 'Medicine – Ward 2', prescriber: 'Dr. N. Pillai', indication: 'enteric_fever', drug: 'ciprofloxacin', dose: 500, frequency: 2, route: 'PO', durationDays: 7, cultureSent: false, crCl: 82, allergies: [], organism: null, prescribedAt: '2026-10-08T11:35:00' },
  { id: 'RX-24113', patientName: 'Deepak Verma', uhid: 'UH-881210', age: 49, sex: 'M', weightKg: 82, ward: 'MICU', prescriber: 'Dr. P. Kulkarni', indication: 'sepsis_hai', drug: 'pip_taz', dose: 4500, frequency: 4, route: 'IV', durationDays: 7, cultureSent: true, crCl: 76, allergies: [], organism: 'K. pneumoniae', prescribedAt: '2026-10-08T11:50:00' },
  { id: 'RX-24114', patientName: 'Meena Kumari', uhid: 'UH-882612', age: 31, sex: 'F', weightKg: 54, ward: 'Obstetrics', prescriber: 'Dr. K. Menon', indication: 'uti_uncomplicated', drug: 'nitrofurantoin', dose: 100, frequency: 2, route: 'PO', durationDays: 5, cultureSent: true, crCl: 110, allergies: [], organism: null, prescribedAt: '2026-10-08T12:04:00' },
  { id: 'RX-24115', patientName: 'Rahul Nair', uhid: 'UH-882650', age: 22, sex: 'M', weightKg: 65, ward: 'Emergency', prescriber: 'Dr. T. Das', indication: 'acute_diarrhoea', drug: 'metronidazole', dose: 400, frequency: 3, route: 'PO', durationDays: 5, cultureSent: false, crCl: null, allergies: [], organism: null, prescribedAt: '2026-10-08T12:20:00' },
  { id: 'RX-24116', patientName: 'Harish Gupta', uhid: 'UH-881998', age: 60, sex: 'M', weightKg: 78, ward: 'Urology', prescriber: 'Dr. R. Iyer', indication: 'uti_complicated', drug: 'amikacin', dose: 1200, frequency: 1, route: 'IV', durationDays: 7, cultureSent: true, crCl: 65, allergies: [], organism: null, prescribedAt: '2026-10-08T12:41:00' },
]
