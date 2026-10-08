import type { Prescription, Route } from './types'

export interface FastApiPrescription {
  brand_name: string
  route: string
  frequency: string
  duration_days: number | null
  flags?: string[]
  step_down_alternative?: string | null
}

export interface FastApiResponse {
  patient_age: number | null
  patient_gender: string | null
  comorbidities: string[]
  diagnosis: string | null
  investigations_ordered: string[]
  culture_ordered: boolean | null
  prescriptions: FastApiPrescription[]
}

const BRAND_TO_DRUG_MAP: Record<string, string> = {
  augmentin: 'amox_clav',
  'moxikind-cv': 'amox_clav',
  clavam: 'amox_clav',
  megamox: 'amox_clav',
  moxclav: 'amox_clav',
  'amoxicillin-clavulanate': 'amox_clav',
  amox_clav: 'amox_clav',
  novamox: 'amoxicillin',
  amoxil: 'amoxicillin',
  amoxicillin: 'amoxicillin',
  monocef: 'ceftriaxone',
  monotax: 'ceftriaxone',
  ceftri: 'ceftriaxone',
  ceftriaxone: 'ceftriaxone',
  'taxim-o': 'cefixime',
  zifi: 'cefixime',
  mahacef: 'cefixime',
  cefix: 'cefixime',
  ceftas: 'caz_avi',
  fortum: 'caz_avi',
  ciplox: 'ciprofloxacin',
  cifran: 'ciprofloxacin',
  ciprobid: 'ciprofloxacin',
  ciprofloxacin: 'ciprofloxacin',
  levomac: 'ciprofloxacin',
  levoflox: 'ciprofloxacin',
  levocin: 'ciprofloxacin',
  tavanic: 'ciprofloxacin',
  azee: 'azithromycin',
  azithral: 'azithromycin',
  zithromax: 'azithromycin',
  azicip: 'azithromycin',
  azithromycin: 'azithromycin',
  meromac: 'meropenem',
  meronem: 'meropenem',
  merotrol: 'meropenem',
  meropenem: 'meropenem',
  pipzo: 'pip_taz',
  tazar: 'pip_taz',
  piztaz: 'pip_taz',
  'piperacillin-tazobactam': 'pip_taz',
  niftas: 'nitrofurantoin',
  furadantin: 'nitrofurantoin',
  nifurantin: 'nitrofurantoin',
  nitrofurantoin: 'nitrofurantoin',
  lizolid: 'linezolid',
  linospan: 'linezolid',
  linezolid: 'linezolid',
  'coly-monas': 'caz_avi',
  colistin: 'caz_avi',
  metrogyl: 'metronidazole',
  flagyl: 'metronidazole',
  metronidazole: 'metronidazole',
  doxy: 'doxycycline',
  'doxt-sl': 'doxycycline',
  doxycap: 'doxycycline',
  doxycycline: 'doxycycline',
  amikacin: 'amikacin',
  mikacin: 'amikacin',
  garamycin: 'amikacin',
  gentamicin: 'amikacin',
  vanco: 'vancomycin',
  vancocin: 'vancomycin',
  vancomycin: 'vancomycin',
  fosfomycin: 'fosfomycin',
  cloxacillin: 'cloxacillin',
}

function resolveDrugKey(brandName: string): string | null {
  const lower = brandName.toLowerCase()
  for (const [pattern, key] of Object.entries(BRAND_TO_DRUG_MAP)) {
    if (lower.includes(pattern)) {
      return key
    }
  }
  return null
}

function resolveIndication(diagnosis: string | null, comorbidities: string[]): string {
  if (!diagnosis) return 'uti_uncomplicated'
  const d = diagnosis.toLowerCase()
  const hasCkd = comorbidities.some((c) => c.toLowerCase().includes('ckd'))

  if (d.includes('cystitis') || d.includes('uti') || d.includes('urinary')) {
    return hasCkd || d.includes('complicated') || d.includes('pyelonephritis') ? 'uti_complicated' : 'uti_uncomplicated'
  }
  if (d.includes('pneumonia') || d.includes('cap') || d.includes('chest')) {
    return 'cap_ward'
  }
  if (d.includes('cellulitis') || d.includes('skin') || d.includes('soft tissue') || d.includes('ssti')) {
    return 'cellulitis'
  }
  if (d.includes('enteric') || d.includes('typhoid')) {
    return 'enteric_fever'
  }
  if (d.includes('sepsis') || d.includes('hai')) {
    return 'sepsis_hai'
  }
  if (d.includes('prophylaxis') || d.includes('surgical') || d.includes('surgery')) {
    return 'surgical_prophylaxis'
  }
  if (d.includes('urti') || d.includes('upper respiratory') || d.includes('cold') || d.includes('cough') || d.includes('viral')) {
    return 'urti'
  }
  if (d.includes('diarrh') || d.includes('gastro')) {
    return 'acute_diarrhoea'
  }

  return 'uti_uncomplicated'
}

function parseDose(brandName: string, drugKey: string): number {
  const match = brandName.match(/\b(\d+)\s*(?:mg|g)?\b/i)
  if (match) {
    const val = parseInt(match[1], 10)
    if (val < 10 && brandName.toLowerCase().includes('g')) return val * 1000
    return val
  }
  const defaultDoses: Record<string, number> = {
    amox_clav: 1200,
    amoxicillin: 500,
    ceftriaxone: 1000,
    ciprofloxacin: 500,
    nitrofurantoin: 100,
    meropenem: 1000,
    pip_taz: 4500,
    azithromycin: 500,
    linezolid: 600,
    caz_avi: 2500,
  }
  return defaultDoses[drugKey] ?? 500
}

function parseFrequency(freq: string | undefined): number {
  if (!freq) return 2
  const f = freq.toUpperCase().trim()
  if (f.includes('OD') || f.includes('QD') || f.includes('ONCE')) return 1
  if (f.includes('BD') || f.includes('BID') || f.includes('TWICE')) return 2
  if (f.includes('TDS') || f.includes('TID') || f.includes('THRICE')) return 3
  if (f.includes('QID') || f.includes('FOUR')) return 4
  return 2
}

function parseRoute(route: string | undefined): Route {
  if (!route) return 'PO'
  const r = route.toUpperCase().trim()
  if (r.includes('IV') || r.includes('INTRAVENOUS')) return 'IV'
  if (r.includes('IM') || r.includes('INTRAMUSCULAR')) return 'IM'
  return 'PO'
}

export function mapFastApiResponseToPrescriptions(data: FastApiResponse): Prescription[] {
  const age = typeof data.patient_age === 'number' ? data.patient_age : parseInt(String(data.patient_age || 45), 10) || 45
  const sex: 'M' | 'F' = (data.patient_gender?.toLowerCase().startsWith('f') ? 'F' : 'M') as 'M' | 'F'
  const comorbidities = data.comorbidities || []
  const hasCkd = comorbidities.some((c) => c.toLowerCase().includes('ckd'))
  const indication = resolveIndication(data.diagnosis, comorbidities)
  const cultureSent = Boolean(data.culture_ordered)
  const now = new Date().toISOString()

  const rxList = data.prescriptions && data.prescriptions.length > 0
    ? data.prescriptions
    : [
        {
          brand_name: 'Prescription Item',
          route: 'Oral',
          frequency: 'BD',
          duration_days: 5,
          flags: [],
          step_down_alternative: null,
        },
      ]

  return rxList.map((rx, idx) => {
    const isExplicitNonAntibiotic = rx.flags?.some((f) => f.includes('NON-ANTIBIOTIC'))
    const resolvedKey = resolveDrugKey(rx.brand_name)
    const isAntibiotic = !isExplicitNonAntibiotic && resolvedKey !== null
    const drugKey = isAntibiotic ? (resolvedKey as string) : 'non_antibiotic'
    const dose = parseDose(rx.brand_name, resolvedKey || 'amox_clav')
    const frequency = parseFrequency(rx.frequency)
    const route = parseRoute(rx.route)
    const durationDays = typeof rx.duration_days === 'number' ? rx.duration_days : 5
    const idNum = Math.floor(25000 + Math.random() * 74000)
    const uhidNum = Math.floor(880000 + Math.random() * 99999)

    const finalFlags = isAntibiotic
      ? (rx.flags || [])
      : ['NON-ANTIBIOTIC: Bypass stewardship checks']

    return {
      id: `RX-${idNum}-${idx + 1}`,
      patientName: `Patient (${age}y ${sex} · ${data.diagnosis || 'Prescription'})`,
      uhid: `UH-${uhidNum}`,
      age,
      sex,
      weightKg: 65,
      ward: 'Outpatient / ER',
      prescriber: 'Treating Physician',
      indication,
      diagnosis: data.diagnosis || 'Clinical Diagnosis',
      drug: drugKey,
      brandName: rx.brand_name || 'Prescription',
      dose,
      frequency,
      route,
      durationDays,
      cultureSent,
      crCl: hasCkd ? 28 : 95,
      allergies: [],
      organism: null,
      prescribedAt: now,
      flags: finalFlags,
      stepDownAlternative: isAntibiotic ? (rx.step_down_alternative || null) : null,
      isAntibiotic,
      prescriptions: rxList.map((p) => ({
        brandName: p.brand_name,
        brand_name: p.brand_name,
        route: p.route,
        frequency: p.frequency,
        durationDays: p.duration_days,
        duration_days: p.duration_days,
        flags: isAntibiotic ? (p.flags || []) : ['NON-ANTIBIOTIC: Bypass stewardship checks'],
        stepDownAlternative: isAntibiotic ? (p.step_down_alternative || null) : null,
        step_down_alternative: isAntibiotic ? (p.step_down_alternative || null) : null,
      })),
      comorbidities,
      cultureOrdered: Boolean(data.culture_ordered),
    }
  })
}
