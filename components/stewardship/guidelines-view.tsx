import { cn } from '@/lib/utils'
import { DRUGS, GUIDELINES } from '@/lib/stewardship/data'
import { formatDose, formatFrequency } from '@/lib/stewardship/engine'

const AWARE_CLASS = {
  Access: 'bg-success/10 text-success',
  Watch: 'bg-flag-dose/15 text-foreground',
  Reserve: 'bg-flag-drug/10 text-flag-drug',
}

export function GuidelinesView() {
  return (
    <section aria-labelledby="gl-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="gl-heading" className="text-xl font-semibold tracking-tight">
          Treatment guidelines
        </h2>
        <p className="text-sm text-muted-foreground">
          Hospital empiric therapy policy, aligned with ICMR treatment guidelines and WHO AWaRe classification.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Object.values(GUIDELINES).map((g) => (
          <article key={g.key} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <header className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">{g.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">{g.key}</p>
              </div>
              {!g.noAntibiotic && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {g.duration.min === g.duration.max ? `${g.duration.max} day` : `${g.duration.min}–${g.duration.max} days`}
                </span>
              )}
            </header>
            {g.noAntibiotic ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">No antibiotic indicated</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-lg border">
                {g.options.map((o) => {
                  const d = DRUGS[o.drug]
                  const dose = d.doseBasis === 'mgPerKg' ? `${o.dose} mg/kg` : formatDose(o.dose)
                  return (
                    <li key={o.drug} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="font-medium">{d.name}</span>{' '}
                        <span className="text-muted-foreground">
                          {dose} {o.route} {formatFrequency(o.frequency).split(' ')[0]}
                        </span>
                        {(o.note || o.firstLine) && (
                          <span className="block text-xs text-muted-foreground">{o.firstLine ? 'First-line' : o.note}</span>
                        )}
                      </span>
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium', AWARE_CLASS[d.aware])}>{d.aware}</span>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-sm text-muted-foreground text-pretty">{g.notes}</p>
            {g.culture.required && <p className="text-xs text-muted-foreground">Culture required: {g.culture.specimen}</p>}
          </article>
        ))}
      </div>
    </section>
  )
}
