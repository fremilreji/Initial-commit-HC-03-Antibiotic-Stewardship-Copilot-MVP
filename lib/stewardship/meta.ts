import type { DecisionAction, FindingCategory, Severity } from './types'

export const CATEGORY_META: Record<FindingCategory, { label: string; dot: string; bar: string; tint: string }> = {
  drug: { label: 'Wrong drug', dot: 'bg-flag-drug', bar: 'bg-flag-drug', tint: 'bg-flag-drug/10 text-flag-drug' },
  dose: { label: 'Dose', dot: 'bg-flag-dose', bar: 'bg-flag-dose', tint: 'bg-flag-dose/15 text-foreground' },
  duration: { label: 'Duration', dot: 'bg-flag-duration', bar: 'bg-flag-duration', tint: 'bg-flag-duration/10 text-flag-duration' },
  culture: { label: 'No culture sent', dot: 'bg-flag-culture', bar: 'bg-flag-culture', tint: 'bg-flag-culture/10 text-foreground' },
}

export const CATEGORY_ORDER: FindingCategory[] = ['drug', 'dose', 'duration', 'culture']

export const SEVERITY_META: Record<Severity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-flag-drug/10 text-flag-drug' },
  major: { label: 'Major', className: 'bg-flag-dose/15 text-foreground' },
  minor: { label: 'Minor', className: 'bg-muted text-muted-foreground' },
}

export const DECISION_META: Record<DecisionAction, { label: string; className: string }> = {
  accepted: { label: 'Suggestion approved', className: 'bg-success/10 text-success' },
  approved_as_written: { label: 'Approved as written', className: 'bg-primary/10 text-primary' },
  escalated: { label: 'Sent to prescriber', className: 'bg-flag-dose/15 text-foreground' },
}
