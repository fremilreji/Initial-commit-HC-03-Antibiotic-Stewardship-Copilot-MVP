'use client'

import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/stewardship/meta'
import type { Decision, FindingCategory, Review } from '@/lib/stewardship/types'

interface Props {
  reviews: Review[]
  decisions: Record<string, Decision>
  activeCategory: FindingCategory | null
  onCategoryChange: (c: FindingCategory | null) => void
}

export function FlagSummary({ reviews, decisions, activeCategory, onCategoryChange }: Props) {
  const safeReviews = reviews ?? []
  const totalReviewed = safeReviews.length

  // Dynamically calculate metrics
  const flagged = safeReviews.filter((r) => (r.findings ?? []).length > 0)
  const pending = flagged.filter((r) => !decisions?.[r.rx.id]).length
  const appropriate = Math.max(0, totalReviewed - flagged.length)
  const flaggedPercentage = totalReviewed > 0 ? Math.round((flagged.length / totalReviewed) * 100) : 0

  const counts = CATEGORY_ORDER.map((c) => ({
    category: c,
    count: safeReviews.filter((r) => (r.findings ?? []).some((f) => f.category === c)).length,
  }))

  const totalCategoryFlags = counts.reduce((s, c) => s + c.count, 0)

  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="summary-heading" className="text-sm text-muted-foreground">
            Prescriptions reviewed today
          </h2>
          <p className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">{totalReviewed}</p>
        </div>
        <dl className="flex gap-8 text-sm">
          <div>
            <dt className="text-muted-foreground">Flagged</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {flagged.length}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({flaggedPercentage}%)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Awaiting pharmacist</dt>
            <dd className="text-xl font-semibold tabular-nums">{pending}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Appropriate</dt>
            <dd className="text-xl font-semibold tabular-nums text-success">{appropriate}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Flag distribution</p>
          <p className="text-xs">{totalCategoryFlags} total {totalCategoryFlags === 1 ? 'flag' : 'flags'}</p>
        </div>
        <div className="flex h-2 w-full gap-1 overflow-hidden rounded-full bg-muted/40" role="img" aria-label="Distribution of flags by category">
          {totalCategoryFlags > 0 ? (
            counts.map(({ category, count }) =>
              count ? (
                <div
                  key={category}
                  className={cn('h-full rounded-full', CATEGORY_META[category].bar)}
                  style={{ width: `${(count / totalCategoryFlags) * 100}%` }}
                />
              ) : null,
            )
          ) : (
            <div className="h-full w-full rounded-full bg-muted/30" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map(({ category, count }) => {
          const active = activeCategory === category
          const pct = totalCategoryFlags > 0 ? Math.round((count / totalCategoryFlags) * 100) : 0
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => onCategoryChange(active ? null : category)}
              className={cn(
                'group flex flex-col gap-1.5 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active && 'border-foreground/30 bg-muted/60',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={cn('size-2.5 rounded-[3px]', CATEGORY_META[category].dot)} aria-hidden />
                  {CATEGORY_META[category].label}
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="text-base tabular-nums">
                <span className="font-semibold">{pct}%</span>
                <span className="text-muted-foreground"> · </span>
                {count} {count === 1 ? 'prescription' : 'prescriptions'}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
