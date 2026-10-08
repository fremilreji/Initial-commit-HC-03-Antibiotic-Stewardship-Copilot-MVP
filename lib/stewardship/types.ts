export type AwareGroup = 'Access' | 'Watch' | 'Reserve'
export type Route = 'IV' | 'PO' | 'IM'
export type DrugFamily = 'penicillin' | 'cephalosporin' | 'carbapenem' | 'other'

export interface RenalRule {
  crClBelow: number
  contraindicated?: boolean
  adjusted?: { dose: number; frequency: number }
  note: string
}

export interface Drug {
  key: string
  name: string
  drugClass: string
  aware: AwareGroup
  family: DrugFamily
  doseBasis: 'mg' | 'mgPerKg'
  minDaily: number
  maxDaily: number
  renal?: RenalRule
}

export interface RegimenOption {
  drug: string
  dose: number
  frequency: number
  route: Route
  durationDays: number
  firstLine?: boolean
  addOn?: boolean
  requiresApproval?: boolean
  note?: string
}

export interface Guideline {
  key: string
  name: string
  noAntibiotic?: boolean
  skipCoverage?: boolean
  likelyOrganisms: { organism: string; weight: number }[]
  options: RegimenOption[]
  duration: { min: number; max: number }
  culture: { required: boolean; specimen: string }
  notes: string
}

export interface Prescription {
  id: string
  patientName: string
  uhid: string
  age: number
  sex: 'M' | 'F'
  weightKg: number
  ward: string
  prescriber: string
  indication: string
  drug: string
  dose: number
  frequency: number
  route: Route
  durationDays: number
  cultureSent: boolean
  crCl: number | null
  allergies: string[]
  organism: string | null
  prescribedAt: string
  diagnosis?: string
  brandName?: string
  flags?: string[]
  isAntibiotic?: boolean
  stepDownAlternative?: string | null
  prescriptions?: Array<{
    brandName?: string
    brand_name?: string
    route?: string
    frequency?: string | number
    durationDays?: number | null
    duration_days?: number | null
    flags?: string[]
    stepDownAlternative?: string | null
    step_down_alternative?: string | null
  }>
  comorbidities?: string[]
  cultureOrdered?: boolean
}

export type FindingCategory = 'drug' | 'dose' | 'duration' | 'culture'
export type Severity = 'critical' | 'major' | 'minor'

export interface Finding {
  id: string
  category: FindingCategory
  severity: Severity
  title: string
  detail: string
}

export interface Suggestion {
  kind: 'switch' | 'adjust' | 'stop'
  drug: string | null
  dose: number
  frequency: number
  route: Route
  durationDays: number
  coverage: number | null
  requiresApproval: boolean
  rationale: string[]
}

export interface OptionCoverage {
  drug: string
  coverage: number | null
  firstLine: boolean
  excluded: string | null
}

export interface Review {
  rx: Prescription
  guideline: Guideline | undefined
  findings: Finding[]
  coverage: number | null
  optionCoverage: OptionCoverage[]
  suggestion: Suggestion | null
  topSeverity: Severity | null
}

export type DecisionAction = 'accepted' | 'approved_as_written' | 'escalated'

export interface Decision {
  action: DecisionAction
  note: string
  decidedAt: string
}
