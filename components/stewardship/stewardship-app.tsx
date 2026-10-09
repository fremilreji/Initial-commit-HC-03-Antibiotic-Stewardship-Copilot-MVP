'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useReviewStore } from '@/hooks/use-review-store'
import type { FindingCategory } from '@/lib/stewardship/types'
import { AntibiogramView } from './antibiogram-view'
import { AppHeader, type View } from './app-header'
import { FlagSummary } from './flag-summary'
import { GuidelinesView } from './guidelines-view'
import { PrescriptionFormDialog } from './prescription-form-dialog'
import { ReviewDetail } from './review-detail'
import { type QueueFilter, ReviewQueue } from './review-queue'
import { UploadDialog } from './upload-dialog'

const SEVERITY_ORDER = { critical: 0, major: 1, minor: 2 } as const

export function StewardshipApp() {
  const {
    reviews,
    decisions,
    addPrescriptions,
    decide,
    undo,
    selectedId: storeSelectedId,
    setSelectedId: setStoreSelectedId,
  } = useReviewStore()
  const [view, setView] = useState<View>('queue')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<'image' | 'csv'>('image')
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<QueueFilter>('pending')
  const [category, setCategory] = useState<FindingCategory | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const activeId = selectedId ?? storeSelectedId

  const visible = useMemo(() => {
    return (reviews ?? [])
      .filter((r) => {
        const flagged = (r.findings ?? []).length > 0
        const decided = !!decisions?.[r.rx.id]
        if (filter === 'pending' && (!flagged || decided)) return false
        if (filter === 'appropriate' && flagged) return false
        if (filter === 'decided' && !decided) return false
        if (category && !(r.findings ?? []).some((f) => f.category === category)) return false
        return true
      })
      .sort((a, b) => {
        const sa = a.topSeverity ? SEVERITY_ORDER[a.topSeverity] : 3
        const sb = b.topSeverity ? SEVERITY_ORDER[b.topSeverity] : 3
        return sa - sb
      })
  }, [reviews, decisions, filter, category])

  const selected = (visible ?? []).find((r) => r.rx.id === activeId) ?? visible?.[0]

  const handleSelect = (id: string | null) => {
    setSelectedId(id)
    setStoreSelectedId(id)
  }

  const handleDecide = (id: string, action: Parameters<typeof decide>[1]['action'], note: string) => {
    decide(id, { action, note })
    const next = (visible ?? []).find((r) => r.rx.id !== id && !decisions?.[r.rx.id])
    const nextId = next ? next.rx.id : null
    handleSelect(nextId)
  }

  const handleOpenImageIntake = () => {
    setUploadMode('image')
    setUploadOpen(true)
  }

  const handleOpenCsvIntake = () => {
    setUploadMode('csv')
    setUploadOpen(true)
  }

  return (
    <div className="min-h-dvh">
      <AppHeader
        onNavigate={setView}
        onUpload={handleOpenCsvIntake}
        onNew={handleOpenImageIntake}
        onManual={() => setFormOpen(true)}
      />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
        <Tabs value={view} onValueChange={(v) => setView(v as View)} className="gap-8">
          <TabsList>
            <TabsTrigger value="queue">Review queue</TabsTrigger>
            <TabsTrigger value="antibiogram">Antibiogram</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="flex flex-col gap-8">
            <FlagSummary reviews={reviews} decisions={decisions} activeCategory={category} onCategoryChange={setCategory} />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
              <ReviewQueue
                reviews={visible}
                decisions={decisions}
                filter={filter}
                onFilterChange={setFilter}
                selectedId={selected?.rx?.id ?? null}
                onSelect={handleSelect}
                onNew={handleOpenImageIntake}
              />
              {selected ? (
                <ReviewDetail
                  key={selected.rx.id}
                  review={selected}
                  decision={decisions?.[selected.rx.id]}
                  onDecide={(action, note) => handleDecide(selected.rx.id, action, note)}
                  onUndo={() => undo(selected.rx.id)}
                  onNew={handleOpenImageIntake}
                />
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-12 text-center bg-card">
                  <p className="font-medium text-foreground">No prescriptions in queue.</p>
                  <p className="text-sm text-muted-foreground">Click 'New prescription' to upload a scan for analysis.</p>
                  <Button onClick={handleOpenImageIntake} size="sm" className="mt-2.5">
                    <Plus data-icon="inline-start" className="size-3.5" /> New prescription
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="antibiogram">
            <AntibiogramView />
          </TabsContent>
          <TabsContent value="guidelines">
            <GuidelinesView />
          </TabsContent>
        </Tabs>
      </main>
      <PrescriptionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(rx) => {
          addPrescriptions([rx])
          setView('queue')
          setFilter('pending')
          setCategory(null)
          handleSelect(rx.id)
        }}
      />
      <UploadDialog
        open={uploadOpen}
        mode={uploadMode}
        onOpenChange={setUploadOpen}
        onSwitchToManual={() => {
          setUploadOpen(false)
          setFormOpen(true)
        }}
        onImport={(rows) => {
          addPrescriptions(rows)
          setView('queue')
          const hasFlags =
            (rows[0]?.flags && rows[0].flags.length > 0) ||
            (rows[0]?.prescriptions?.[0]?.flags && rows[0].prescriptions[0].flags.length > 0)
          setFilter(hasFlags ? 'pending' : 'all')
          setCategory(null)
          if (rows[0]?.id) {
            handleSelect(rows[0].id)
          }
        }}
      />
    </div>
  )
}
