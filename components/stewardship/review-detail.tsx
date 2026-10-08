'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, CircleSlash, Plus, RotateCcw, Send, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ANTIBIOGRAM_PERIOD, DRUGS, SUSCEPTIBILITY_TARGET } from '@/lib/stewardship/data'
import { formatDose, formatFrequency, formatRegimen } from '@/lib/stewardship/engine'
import { CATEGORY_META, DECISION_META, SEVERITY_META } from '@/lib/stewardship/meta'
import type { Decision, DecisionAction, Review } from '@/lib/stewardship/types'
import { useToast } from '@/components/ui/toast'

interface Props {
  review: Review | undefined
  decision: Decision | undefined
  onDecide: (action: DecisionAction, note: string) => void
  onUndo: () => void
  onNew?: () => void
}

export function ReviewDetail({ review, decision, onDecide, onUndo, onNew }: Props) {
  const [note, setNote] = useState('')
  const [verifiedRxId, setVerifiedRxId] = useState<string | null>(null)
  const { toast } = useToast()

  if (!review || !review.rx) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-12 text-center bg-card">
        <p className="font-medium text-foreground">No prescriptions in queue.</p>
        <p className="text-sm text-muted-foreground">Click 'New prescription' to upload a scan for analysis.</p>
        {onNew && (
          <Button onClick={onNew} size="sm" className="mt-2.5">
            <Plus data-icon="inline-start" className="size-3.5" /> New prescription
          </Button>
        )}
      </div>
    )
  }

  const selectedPrescription = review.rx
  const firstRxItem = selectedPrescription.prescriptions?.[0]
  const isVerified = verifiedRxId === selectedPrescription.id

  // Ultra-fast keyboard triage shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) || el?.isContentEditable) return

      const key = e.key.toLowerCase()
      if (key === 'v') {
        e.preventDefault()
        setVerifiedRxId(selectedPrescription.id)
        toast('Extracted text verified [Key V]', 'success')
      } else if (key === '1' || key === 'a') {
        e.preventDefault()
        setVerifiedRxId(selectedPrescription.id)
        onDecide('accepted', note || 'Suggestion approved: switched to guideline alternative')
        toast('Suggestion approved: switched to guideline alternative [Key 1]', 'success')
        setNote('')
      } else if (key === '2' || key === 's') {
        e.preventDefault()
        setVerifiedRxId(selectedPrescription.id)
        onDecide('escalated', note || 'Sent to prescribing clinician for clarification')
        toast('Sent to prescriber for clarification [Key 2]', 'info')
        setNote('')
      } else if (key === '3' || key === 'w') {
        e.preventDefault()
        setVerifiedRxId(selectedPrescription.id)
        onDecide('approved_as_written', note || 'Approved as written by pharmacist')
        toast('Prescription approved as written by pharmacist [Key 3]', 'warning')
        setNote('')
      } else if (key === 'z' || key === 'u') {
        if (decision) {
          e.preventDefault()
          onUndo()
          toast('Decision undone [Key Z]', 'info')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPrescription?.id, note, decision, onDecide, onUndo, toast])

  const isNonAntibiotic = Boolean(
    firstRxItem?.flags?.some((f) => f.includes('NON-ANTIBIOTIC')) ||
    selectedPrescription.flags?.some((f) => f.includes('NON-ANTIBIOTIC')) ||
    selectedPrescription.isAntibiotic === false ||
    (firstRxItem?.brandName?.toLowerCase().includes('lisinopril')) ||
    (selectedPrescription.brandName?.toLowerCase().includes('lisinopril'))
  )

  // 1. Dynamic references for "AS PRESCRIBED" and "SUGGESTED REGIMEN"
  const asPrescribedDrug =
    firstRxItem?.brandName ||
    firstRxItem?.brand_name ||
    selectedPrescription.brandName ||
    formatRegimen(selectedPrescription)

  const asPrescribedDiagnosis =
    selectedPrescription.diagnosis ||
    review.guideline?.name ||
    selectedPrescription.indication

  const suggestedAlternative = isNonAntibiotic
    ? null
    : firstRxItem?.stepDownAlternative ||
      firstRxItem?.step_down_alternative ||
      selectedPrescription.stepDownAlternative ||
      (review.suggestion ? formatRegimen(review.suggestion) : null)

  // 2. Dynamic Flags: map over selectedPrescription.prescriptions[0].flags
  const rawFlags: string[] =
    firstRxItem?.flags && firstRxItem.flags.length > 0
      ? firstRxItem.flags
      : selectedPrescription.flags && selectedPrescription.flags.length > 0
        ? selectedPrescription.flags
        : (review.findings ?? []).map((f) => f.title)

  const flagsList = isNonAntibiotic
    ? []
    : rawFlags.filter((f) => !f.includes('NON-ANTIBIOTIC'))

  const facts = [
    `${selectedPrescription.age} y · ${selectedPrescription.sex}`,
    `${selectedPrescription.weightKg} kg`,
    selectedPrescription.crCl != null ? `CrCl ${selectedPrescription.crCl} mL/min` : 'CrCl not recorded',
    (selectedPrescription.allergies ?? []).length ? `Allergy: ${selectedPrescription.allergies.join(', ')}` : 'No known allergies',
    selectedPrescription.cultureSent ? `Culture sent${selectedPrescription.organism ? ` · ${selectedPrescription.organism}` : ''}` : 'No culture sent',
  ]

  return (
    <article className="flex flex-col rounded-xl border bg-card" aria-labelledby="rx-heading">
      <header className="flex flex-col gap-3 border-b p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {selectedPrescription.id} · {selectedPrescription.uhid}
            </p>
            <h2 id="rx-heading" className="text-xl font-semibold tracking-tight">
              {selectedPrescription.patientName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedPrescription.ward} · {selectedPrescription.prescriber}
            </p>
          </div>
          {decision && (
            <span className={cn('rounded-md px-2 py-1 text-xs font-medium', DECISION_META[decision.action].className)}>
              {DECISION_META[decision.action].label}
            </span>
          )}
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Patient details">
          {facts.map((f) => (
            <li
              key={f}
              className={cn(
                'rounded-md border px-2 py-0.5 text-xs text-muted-foreground',
                f.startsWith('Allergy') && 'border-flag-drug/30 text-flag-drug',
                f === 'No culture sent' && 'border-flag-culture/40',
              )}
            >
              {f}
            </li>
          ))}
        </ul>
      </header>

      <div className="flex flex-col gap-6 p-5">
        {/* Regimen comparison section */}
        <section aria-label="Regimen comparison" className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          <div className="flex flex-col gap-1 rounded-lg border p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">As prescribed</p>
            <p className="text-sm font-semibold text-foreground text-pretty">{asPrescribedDrug}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{asPrescribedDiagnosis}</span>
              {isNonAntibiotic ? (
                <span className="ml-1 text-primary">· Non-antibiotic agent</span>
              ) : isVerified && review.coverage != null ? (
                <span> · {review.coverage}% local susceptibility</span>
              ) : null}
            </p>
          </div>
          <ArrowRight className="hidden size-4 self-center text-muted-foreground md:block" aria-hidden />
          <div
            className={cn(
              'flex flex-col gap-1 rounded-lg border p-4',
              isNonAntibiotic
                ? 'border-blue-500/30 bg-blue-500/5'
                : !isVerified
                  ? 'border-dashed bg-muted/20'
                  : suggestedAlternative
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-success/30 bg-success/5',
            )}
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {isNonAntibiotic ? 'Assessment' : suggestedAlternative ? 'Suggested regimen' : 'Assessment'}
            </p>
            {isNonAntibiotic ? (
              <>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-blue-500 text-pretty">
                  <CheckCircle2 className="size-4 shrink-0 text-blue-500" aria-hidden />
                  Non-antibiotic agent (Checks bypassed)
                </p>
                <p className="text-xs text-muted-foreground">
                  Stewardship review and AWaRe restrictions not required.
                </p>
              </>
            ) : !isVerified ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldAlert className="size-4 shrink-0 text-amber-500" />
                Awaiting pharmacist verification below
              </p>
            ) : suggestedAlternative ? (
              <>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-primary text-pretty">
                  <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
                  {suggestedAlternative}
                </p>
                <p className="text-xs text-muted-foreground">
                  Step-down alternative based on hospital antibiogram
                </p>
              </>
            ) : (
              <p className="flex items-center gap-1.5 text-sm font-medium text-success">
                <CheckCircle2 className="size-4" aria-hidden /> Consistent with hospital guideline
              </p>
            )}
          </div>
        </section>

        {/* Human-in-the-Loop Safety Checkpoint */}
        <section aria-label="Human-in-the-Loop Safety Checkpoint" className="flex flex-col gap-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Safety Checkpoint (Human-in-the-Loop)</h3>
            </div>
            {isVerified ? (
              <span className="flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 text-xs font-medium text-success border border-success/30">
                <CheckCircle2 className="size-3.5" /> Verified by Pharmacist
              </span>
            ) : (
              <span className="rounded bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning border border-warning/30">
                Pending Verification
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Verify OCR-extracted medication details against the physical prescription before clinical stewardship rules are applied.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-md border bg-card p-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Extracted Drug</span>
              <span className="font-semibold text-foreground break-words">{asPrescribedDrug}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Route</span>
              <span className="font-semibold text-foreground">{firstRxItem?.route || selectedPrescription.route || 'Oral'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Dose &amp; Frequency</span>
              <span className="font-semibold text-foreground">
                {selectedPrescription.dose ? formatDose(selectedPrescription.dose) : ''} {firstRxItem?.frequency || (selectedPrescription.frequency ? formatFrequency(selectedPrescription.frequency) : 'BD')}
              </span>
            </div>
          </div>

          {!isVerified ? (
            <Button
              type="button"
              size="default"
              onClick={() => {
                setVerifiedRxId(selectedPrescription.id)
                toast('Extracted text verified: Clinical rules unlocked', 'success')
              }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center gap-2 py-2.5 shadow-sm"
            >
              <CheckCircle2 className="size-4" />
              Verify Extracted Text: Matches Physical Prescription
            </Button>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
              <span className="text-success font-medium flex items-center gap-1">
                <CheckCircle2 className="size-3.5" /> Clinical rules unlocked &amp; active
              </span>
              <button
                type="button"
                onClick={() => setVerifiedRxId(null)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Re-verify
              </button>
            </div>
          )}
        </section>

        {/* Dynamic Issues found / Flags section */}
        <section aria-labelledby="findings-heading" className="flex flex-col gap-2">
          <h3 id="findings-heading" className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className={cn('size-4', !isVerified ? 'text-muted-foreground' : isNonAntibiotic ? 'text-blue-500' : flagsList.length > 0 ? 'text-destructive' : 'text-success')} />
              {!isVerified
                ? 'Clinical Flags (Awaiting Verification)'
                : isNonAntibiotic
                  ? 'Stewardship Status'
                  : `${flagsList.length} ${flagsList.length === 1 ? 'issue' : 'issues'} found`}
            </span>
          </h3>

          {!isVerified ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground bg-muted/10">
              <p className="font-medium text-foreground">Clinical Flags Locked</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click &ldquo;Verify Extracted Text: Matches Physical Prescription&rdquo; above to audit clinical flags.
              </p>
            </div>
          ) : isNonAntibiotic ? (
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-blue-400 text-sm font-medium">
              <CheckCircle2 className="size-4 shrink-0 text-blue-400" />
              <span>NON-ANTIBIOTIC: Medication is not an antimicrobial. AWaRe classification, culture mandate, and stewardship checks bypassed.</span>
            </div>
          ) : flagsList.length > 0 ? (
            <ul className="flex flex-col divide-y rounded-lg border border-destructive/20 bg-destructive/5 overflow-hidden">
              {flagsList.map((flag, idx) => (
                <li key={`${flag}-${idx}`} className="flex items-center justify-between gap-3 p-3.5 bg-card/60">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="size-2 shrink-0 rounded-full bg-destructive" aria-hidden />
                    <span className="text-sm font-semibold text-destructive break-words">
                      {flag}
                    </span>
                  </div>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-destructive/15 text-destructive border border-destructive/30">
                    RED FLAG
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-4 text-success text-sm font-medium">
              <CheckCircle2 className="size-4" /> Consistent with hospital guideline. No issues identified.
            </div>
          )}
        </section>

        {/* Antibiogram options section */}
        {!isNonAntibiotic && (review.optionCoverage ?? []).some((o) => o.coverage != null) && (
          <section aria-labelledby="coverage-heading" className="flex flex-col gap-2">
            <div>
              <h3 id="coverage-heading" className="text-sm font-medium">
                Guideline options vs local antibiogram
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({selectedPrescription.organism ? selectedPrescription.organism : 'weighted by likely pathogens'}, {ANTIBIOGRAM_PERIOD})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                Data sources: ICMR Antimicrobial Guidelines 2024 &amp; Simulated Hospital Antibiogram (Jan–Jun 2026).
              </p>
            </div>
            <ul className="flex flex-col gap-2.5">
              {(review.optionCoverage ?? []).map((o) => {
                const value = o.coverage ?? 0
                const tone = value >= SUSCEPTIBILITY_TARGET ? 'bg-success' : value >= 60 ? 'bg-flag-dose' : 'bg-flag-drug'
                return (
                  <li key={o.drug} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className={cn(o.excluded && 'text-muted-foreground line-through')}>
                        {DRUGS[o.drug]?.name ?? o.drug}
                        {o.firstLine && <span className="ml-1.5 text-xs text-primary no-underline">First-line</span>}
                        {o.excluded && <span className="ml-1.5 text-xs">({o.excluded})</span>}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {o.coverage != null ? `${o.coverage}%` : '—'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn('h-full transition-all', tone)} style={{ width: `${value}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Pharmacist Action buttons */}
        <section aria-labelledby="actions-heading" className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h3 id="actions-heading" className="text-sm font-medium">
              Pharmacist action
            </h3>
            {decision && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onUndo()
                  toast('Decision undone: returned to review queue', 'info')
                }}
              >
                <RotateCcw data-icon="inline-start" /> Undo
              </Button>
            )}
          </div>
          <Textarea
            placeholder="Pharmacist note (optional for suggestions, required for overrides)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              onClick={() => {
                setVerifiedRxId(selectedPrescription.id)
                onDecide('accepted', note || 'Suggestion approved: switched to guideline alternative')
                toast('Suggestion approved: switched to guideline alternative', 'success')
                setNote('')
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              Approve suggestion
              <kbd className="ml-1 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-mono font-medium">1</kbd>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setVerifiedRxId(selectedPrescription.id)
                onDecide('escalated', note || 'Sent to prescribing clinician for clarification')
                toast('Sent to prescriber for clarification', 'info')
                setNote('')
              }}
              className="flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <Send className="size-4" />
              Send to prescriber
              <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium">2</kbd>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setVerifiedRxId(selectedPrescription.id)
                onDecide('approved_as_written', note || 'Approved as written by pharmacist')
                toast('Prescription approved as written by pharmacist', 'warning')
                setNote('')
              }}
              className="flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <AlertTriangle className="size-4 text-warning" />
              Approve as written
              <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium">3</kbd>
            </Button>
          </div>
        </section>
      </div>
    </article>
  )
}
