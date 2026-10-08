import { cn } from '@/lib/utils'
import { ANTIBIOGRAM, ANTIBIOGRAM_DRUGS, ANTIBIOGRAM_PERIOD, DRUGS, ISOLATE_COUNTS, ORGANISMS, SUSCEPTIBILITY_TARGET } from '@/lib/stewardship/data'

function tone(v: number) {
  if (v >= SUSCEPTIBILITY_TARGET) return 'bg-success/15 text-foreground'
  if (v >= 60) return 'bg-flag-dose/20 text-foreground'
  return 'bg-flag-drug/15 text-flag-drug'
}

export function AntibiogramView() {
  return (
    <section aria-labelledby="abg-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="abg-heading" className="text-xl font-semibold tracking-tight">
            Local antibiogram
          </h2>
          <p className="text-sm text-muted-foreground">
            % susceptible, first isolate per patient · {ANTIBIOGRAM_PERIOD}. Used to score every prescription.
          </p>
        </div>
        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Legend">
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-success/40" />≥ {SUSCEPTIBILITY_TARGET}%</li>
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-flag-dose/50" />60–79%</li>
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-flag-drug/40" />{'< 60%'}</li>
        </ul>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th scope="col" className="sticky left-0 bg-card px-3 py-2 text-left font-medium">Organism</th>
              {ANTIBIOGRAM_DRUGS.map((d) => (
                <th key={d} scope="col" className="px-2 py-2 text-center text-xs font-medium whitespace-nowrap text-muted-foreground">
                  {DRUGS[d].name.replace('-clavulanate', '-clav').replace('Piperacillin-tazobactam', 'Pip-tazo').replace('Ceftazidime-avibactam', 'Caz-avi')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ORGANISMS.map((o) => (
              <tr key={o} className="border-b last:border-b-0">
                <th scope="row" className="sticky left-0 bg-card px-3 py-2 text-left font-medium whitespace-nowrap">
                  <span className="italic">{o}</span>
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">n={ISOLATE_COUNTS[o]}</span>
                </th>
                {ANTIBIOGRAM_DRUGS.map((d) => {
                  const v = ANTIBIOGRAM[o][d]
                  return (
                    <td key={d} className="p-1 text-center">
                      {v == null ? (
                        <span className="text-muted-foreground/50" aria-label="Not tested">—</span>
                      ) : (
                        <span className={cn('block rounded px-1.5 py-1 tabular-nums', tone(v))}>{v}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Sample data for demonstration. Replace with your microbiology lab&apos;s cumulative antibiogram (CLSI M39) before clinical use.
      </p>
    </section>
  )
}
