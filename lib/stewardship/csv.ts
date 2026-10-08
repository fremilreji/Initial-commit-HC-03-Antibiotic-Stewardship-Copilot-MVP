import { DRUGS, GUIDELINES } from './data'
import type { Prescription, Route } from './types'

export const CSV_COLUMNS = [
  'id', 'patient_name', 'uhid', 'age', 'sex', 'weight_kg', 'ward', 'prescriber', 'indication', 'drug',
  'dose_mg', 'frequency_per_day', 'route', 'duration_days', 'culture_sent', 'crcl', 'allergies', 'organism',
] as const

export const CSV_TEMPLATE = [
  CSV_COLUMNS.join(','),
  'RX-30001,Asha Reddy,UH-900101,46,F,61,Medicine – Ward 3,Dr. V. Nair,cap_ward,azithromycin,500,1,PO,5,no,85,,',
  'RX-30002,Kiran Shah,UH-900102,70,M,66,MICU,Dr. P. Kulkarni,sepsis_hai,meropenem,2000,3,IV,14,yes,38,,K. pneumoniae',
  'RX-30003,Neha Joshi,UH-900103,33,F,57,Surgery – OT 1,Dr. R. Iyer,surgical_prophylaxis,cefazolin,2000,1,IV,1,no,100,penicillin,',
].join('\n')

export interface ParseResult {
  rows: Prescription[]
  errors: string[]
}

function splitLine(line: string) {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

export function parsePrescriptionCsv(text: string, fileName: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], errors: [`${fileName}: no data rows found.`] }
  const header = splitLine(lines[0]).map((h) => h.toLowerCase())
  const missing = CSV_COLUMNS.filter((c) => !['allergies', 'organism', 'crcl'].includes(c) && !header.includes(c))
  if (missing.length) return { rows: [], errors: [`${fileName}: missing columns ${missing.join(', ')}.`] }

  const rows: Prescription[] = []
  const errors: string[] = []
  lines.slice(1).forEach((line, i) => {
    const cells = splitLine(line)
    const get = (c: string) => cells[header.indexOf(c)] ?? ''
    const rowLabel = `${fileName} row ${i + 2}`
    const indication = get('indication')
    const drug = get('drug')
    const num = (c: string) => Number(get(c))
    if (!GUIDELINES[indication]) return errors.push(`${rowLabel}: unknown indication "${indication}".`)
    if (!DRUGS[drug]) return errors.push(`${rowLabel}: unknown drug "${drug}".`)
    const numeric = ['age', 'weight_kg', 'dose_mg', 'frequency_per_day', 'duration_days']
    const bad = numeric.find((c) => !Number.isFinite(num(c)) || num(c) <= 0)
    if (bad) return errors.push(`${rowLabel}: "${bad}" must be a positive number.`)
    const route = get('route').toUpperCase()
    const crcl = get('crcl')
    rows.push({
      id: get('id') || `RX-UP-${Date.now().toString(36)}-${i}`,
      patientName: get('patient_name'),
      uhid: get('uhid'),
      age: num('age'),
      sex: get('sex').toUpperCase() === 'F' ? 'F' : 'M',
      weightKg: num('weight_kg'),
      ward: get('ward'),
      prescriber: get('prescriber'),
      indication,
      drug,
      dose: num('dose_mg'),
      frequency: Math.round(num('frequency_per_day')),
      route: (['IV', 'PO', 'IM'].includes(route) ? route : 'PO') as Route,
      durationDays: Math.round(num('duration_days')),
      cultureSent: ['yes', 'true', '1', 'y'].includes(get('culture_sent').toLowerCase()),
      crCl: crcl && Number.isFinite(Number(crcl)) ? Number(crcl) : null,
      allergies: get('allergies').split(';').map((a) => a.trim().toLowerCase()).filter(Boolean),
      organism: get('organism') || null,
      prescribedAt: new Date().toISOString(),
    })
  })
  return { rows, errors }
}
