'use client'

import { CheckCircle2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DRUGS } from '@/lib/stewardship/data'
import { formatDose, formatFrequency } from '@/lib/stewardship/engine'
import { CATEGORY_META, CATEGORY_ORDER, DECISION_META, SEVERITY_META } from '@/lib/stewardship/meta'
import type { Decision, Review } from '@/lib/stewardship/types'

export type QueueFilter = 'pending' | 'all' | 'appropriate' | 'decided'

const FILTERS: { value: QueueFilter; label: string }[] = [
  { value: 'pending', label: 'Needs review' },
  { value: 'decided', label: 'Decided' },
  { value: 'appropriate', label: 'Appropriate' },
  { value: 'all', label: 'All' },
]

interface Props {
  reviews: Review[]
  decisions: Record<string, Decision>
  filter: QueueFilter
  onFilterChange: (f: QueueFilter) => void
  selectedId: string | null
  onSelect: (id: string) => void
  onNew?: () => void
}

export function ReviewQueue({ reviews, decisions, filter, onFilterChange, selectedId, onSelect, onNew }: Props) {
  const safeReviews = reviews ?? []

  return (
    <div className="flex min-h-0 flex-col rounded-xl border bg-card">
      <div className="flex flex-wrap gap-1 border-b p-2" role="tablist" aria-label="Filter prescriptions">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => onFilterChange(f.value)}
            className={cn(
              'rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              filter === f.value && 'bg-muted font-medium text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {safeReviews.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center gap-1.5">
          <p className="font-medium text-foreground">No prescriptions in queue.</p>
          <p className="text-sm text-muted-foreground">Click 'New prescription' to upload a scan for analysis.</p>
          {onNew && (
            <Button onClick={onNew} size="sm" variant="outline" className="mt-2.5">
              <Plus data-icon="inline-start" className="size-3.5" /> New prescription
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex max-h-[70vh] flex-col overflow-y-auto" aria-label="Prescriptions">
          {safeReviews.map((r) => {
            const decision = decisions?.[r.rx.id]
            const categories = CATEGORY_ORDER.filter((c) => (r.findings ?? []).some((f) => f.category === c))
            const firstRx = r.rx.prescriptions?.[0]
            const brandName =
              firstRx?.brandName ||
              firstRx?.brand_name ||
              r.rx.brandName ||
              DRUGS[r.rx.drug]?.name ||
              r.rx.drug
            const route = firstRx?.route || r.rx.route
            const frequency =
              firstRx?.frequency ||
              (r.rx.frequency ? formatFrequency(r.rx.frequency).split(' ')[0] : '')
            const durationDays = firstRx?.durationDays ?? firstRx?.duration_days ?? r.rx.durationDays
            return (
              <li key={r.rx.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(r.rx.id)}
                  aria-current={selectedId === r.rx.id}
                  className={cn(
                    'flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none',
                    selectedId === r.rx.id && 'bg-muted/70',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{r.rx.patientName}</span>
                    {decision ? (
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium', DECISION_META[decision.action].className)}>
                        {DECISION_META[decision.action].label}
                      </span>
                    ) : r.topSeverity ? (
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium', SEVERITY_META[r.topSeverity].className)}>
                        {SEVERITY_META[r.topSeverity].label}
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-success">
                        <CheckCircle2 className="size-3.5" aria-hidden /> Appropriate
                      </span>
                    )}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {brandName} {route} {frequency}{durationDays ? ` × ${durationDays}d` : ''}
                  </span>
                  <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      {r.rx.id} · {r.rx.ward}
                    </span>
                    <span className="flex shrink-0 gap-1" aria-label={categories.map((c) => CATEGORY_META[c].label).join(', ')}>
                      {categories.map((c) => (
                        <span key={c} className={cn('size-2 rounded-[2px]', CATEGORY_META[c].dot)} title={CATEGORY_META[c].label} />
                      ))}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
