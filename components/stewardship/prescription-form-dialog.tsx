'use client'

import { useId, useMemo, useState } from 'react'
import { CircleCheck, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { DRUGS, GUIDELINES, ORGANISMS } from '@/lib/stewardship/data'
import { formatRegimen, reviewPrescription } from '@/lib/stewardship/engine'
import { CATEGORY_META, SEVERITY_META } from '@/lib/stewardship/meta'
import type { Prescription, Route } from '@/lib/stewardship/types'

interface FormState {
  patientName: string
  uhid: string
  age: string
  sex: 'M' | 'F'
  weightKg: string
  ward: string
  prescriber: string
  indication: string
  drug: string
  dose: string
  frequency: string
  route: Route
  durationDays: string
  crCl: string
  penicillinAllergy: boolean
  cultureSent: boolean
  organism: string
}

const EMPTY: FormState = {
  patientName: '',
  uhid: '',
  age: '',
  sex: 'M',
  weightKg: '',
  ward: '',
  prescriber: '',
  indication: 'cap_ward',
  drug: 'ceftriaxone',
  dose: '1000',
  frequency: '1',
  route: 'IV',
  durationDays: '5',
  crCl: '',
  penicillinAllergy: false,
  cultureSent: false,
  organism: '',
}

const FREQUENCIES = [
  { value: '1', label: 'OD (once daily)' },
  { value: '2', label: 'BD (12-hourly)' },
  { value: '3', label: 'TDS (8-hourly)' },
  { value: '4', label: 'QID (6-hourly)' },
]

const inputClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30'

function toNumber(v: string) {
  const n = Number(v)
  return Number.isFinite(n) && v.trim() !== '' ? n : null
}

function buildPrescription(f: FormState, id: string): Prescription {
  return {
    id,
    patientName: f.patientName.trim() || 'Unnamed patient',
    uhid: f.uhid.trim() || '—',
    age: toNumber(f.age) ?? 0,
    sex: f.sex,
    weightKg: toNumber(f.weightKg) ?? 60,
    ward: f.ward.trim() || 'Unspecified ward',
    prescriber: f.prescriber.trim() || 'Unknown prescriber',
    indication: f.indication,
    drug: f.drug,
    dose: toNumber(f.dose) ?? 0,
    frequency: toNumber(f.frequency) ?? 1,
    route: f.route,
    durationDays: toNumber(f.durationDays) ?? 0,
    cultureSent: f.cultureSent,
    crCl: toNumber(f.crCl),
    allergies: f.penicillinAllergy ? ['penicillin'] : [],
    organism: f.organism || null,
    prescribedAt: new Date().toISOString(),
  }
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: (id: string) => React.ReactNode; className?: string }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
      </label>
      {children(id)}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  )
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (rx: Prescription) => void
}

export function PrescriptionFormDialog({ open, onOpenChange, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const errors = {
    patientName: !form.patientName.trim(),
    dose: !(toNumber(form.dose)! > 0),
    durationDays: !(toNumber(form.durationDays)! > 0),
    weightKg: !(toNumber(form.weightKg)! > 0),
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const preview = useMemo(() => reviewPrescription(buildPrescription(form, 'preview')), [form])

  const close = (next: boolean) => {
    if (!next) {
      setForm(EMPTY)
      setTouched(false)
    }
    onOpenChange(next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (hasErrors) return
    onSubmit(buildPrescription(form, `RX-${Date.now().toString().slice(-6)}`))
    close(false)
  }

  const drug = DRUGS[form.drug]

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <form onSubmit={handleSubmit} className="flex max-h-[92dvh] flex-col" noValidate>
          <DialogHeader className="border-b p-6">
            <DialogTitle>New antibiotic prescription</DialogTitle>
            <DialogDescription>
              Enter the order as written. It is checked against the local antibiogram and hospital guideline as you type.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex flex-col gap-8 p-6">
              <Section title="Patient">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Patient name">
                    {(id) => (
                      <input
                        id={id}
                        className={inputClass}
                        value={form.patientName}
                        onChange={(e) => set('patientName', e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        aria-invalid={touched && errors.patientName}
                        autoComplete="off"
                      />
                    )}
                  </Field>
                  <Field label="UHID">
                    {(id) => (
                      <input id={id} className={inputClass} value={form.uhid} onChange={(e) => set('uhid', e.target.value)} placeholder="UH-000000" autoComplete="off" />
                    )}
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Age">
                    {(id) => <input id={id} type="number" min={0} className={inputClass} value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="years" />}
                  </Field>
                  <Field label="Sex">
                    {(id) => (
                      <select id={id} className={inputClass} value={form.sex} onChange={(e) => set('sex', e.target.value as 'M' | 'F')}>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    )}
                  </Field>
                  <Field label="Weight" hint="kg">
                    {(id) => (
                      <input
                        id={id}
                        type="number"
                        min={1}
                        className={inputClass}
                        value={form.weightKg}
                        onChange={(e) => set('weightKg', e.target.value)}
                        aria-invalid={touched && errors.weightKg}
                      />
                    )}
                  </Field>
                  <Field label="CrCl" hint="mL/min">
                    {(id) => <input id={id} type="number" min={0} className={inputClass} value={form.crCl} onChange={(e) => set('crCl', e.target.value)} placeholder="optional" />}
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ward / unit">
                    {(id) => <input id={id} className={inputClass} value={form.ward} onChange={(e) => set('ward', e.target.value)} placeholder="e.g. Medicine – Ward 4" />}
                  </Field>
                  <Field label="Prescriber">
                    {(id) => <input id={id} className={inputClass} value={form.prescriber} onChange={(e) => set('prescriber', e.target.value)} placeholder="e.g. Dr. A. Rao" />}
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-primary" checked={form.penicillinAllergy} onChange={(e) => set('penicillinAllergy', e.target.checked)} />
                  Penicillin allergy documented
                </label>
              </Section>

              <Section title="Order">
                <Field label="Indication">
                  {(id) => (
                    <select id={id} className={inputClass} value={form.indication} onChange={(e) => set('indication', e.target.value)}>
                      {Object.values(GUIDELINES).map((g) => (
                        <option key={g.key} value={g.key}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Antibiotic">
                    {(id) => (
                      <select id={id} className={inputClass} value={form.drug} onChange={(e) => set('drug', e.target.value)}>
                        {Object.values(DRUGS).map((d) => (
                          <option key={d.key} value={d.key}>
                            {d.name} ({d.aware})
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Route">
                    {(id) => (
                      <select id={id} className={inputClass} value={form.route} onChange={(e) => set('route', e.target.value as Route)}>
                        <option value="IV">IV</option>
                        <option value="PO">PO</option>
                        <option value="IM">IM</option>
                      </select>
                    )}
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field label="Dose" hint="mg per dose">
                    {(id) => (
                      <input
                        id={id}
                        type="number"
                        min={1}
                        className={inputClass}
                        value={form.dose}
                        onChange={(e) => set('dose', e.target.value)}
                        aria-invalid={touched && errors.dose}
                      />
                    )}
                  </Field>
                  <Field label="Frequency">
                    {(id) => (
                      <select id={id} className={inputClass} value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
                        {FREQUENCIES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Duration" hint="days" className="col-span-2 sm:col-span-1">
                    {(id) => (
                      <input
                        id={id}
                        type="number"
                        min={1}
                        className={inputClass}
                        value={form.durationDays}
                        onChange={(e) => set('durationDays', e.target.value)}
                        aria-invalid={touched && errors.durationDays}
                      />
                    )}
                  </Field>
                </div>
                {drug && (
                  <p className="text-xs text-muted-foreground">
                    {drug.drugClass} · usual daily range {drug.minDaily}–{drug.maxDaily} {drug.doseBasis === 'mgPerKg' ? 'mg/kg' : 'mg'}
                  </p>
                )}
              </Section>

              <Section title="Microbiology">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-primary" checked={form.cultureSent} onChange={(e) => set('cultureSent', e.target.checked)} />
                  Culture sent before first dose
                </label>
                <Field label="Organism isolated" hint="if known">
                  {(id) => (
                    <select id={id} className={inputClass} value={form.organism} onChange={(e) => set('organism', e.target.value)}>
                      <option value="">Not yet known (empiric)</option>
                      {ORGANISMS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </Section>
            </div>

            <aside className="flex flex-col gap-4 border-t bg-muted/40 p-6 md:border-t-0 md:border-l" aria-live="polite">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live review</p>
              {preview.findings.length === 0 ? (
                <div className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>Appropriate per hospital guideline and local susceptibility.</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldAlert className="size-4 text-destructive" />
                    {preview.findings.length} {preview.findings.length === 1 ? 'issue' : 'issues'} will be flagged
                  </div>
                  <ul className="flex flex-col gap-2">
                    {preview.findings.map((f) => (
                      <li key={f.id} className="flex flex-col gap-1 rounded-lg border bg-background p-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('size-2 shrink-0 rounded-full', CATEGORY_META[f.category].dot)} aria-hidden />
                          <span className="text-sm font-medium leading-snug">{f.title}</span>
                        </div>
                        <Badge variant="outline" className={cn('w-fit', SEVERITY_META[f.severity].className)}>
                          {SEVERITY_META[f.severity].label}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {preview.suggestion && (
                <div className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Suggested</p>
                  <p className="text-sm font-medium">
                    {preview.suggestion.kind === 'stop' ? 'Stop antibiotic' : formatRegimen(preview.suggestion)}
                  </p>
                  {preview.suggestion.coverage != null && (
                    <p className="text-xs text-muted-foreground">{preview.suggestion.coverage}% local susceptibility</p>
                  )}
                </div>
              )}
            </aside>
          </div>

          <DialogFooter className="m-0 border-t p-4 sm:justify-between">
            <p className="text-xs text-muted-foreground">{touched && hasErrors ? 'Fill in the highlighted fields.' : 'Pharmacist approval happens in the review queue.'}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit for review</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
