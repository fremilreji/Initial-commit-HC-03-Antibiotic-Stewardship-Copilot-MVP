'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { reviewPrescription } from '@/lib/stewardship/engine'
import { mapFastApiResponseToPrescriptions, type FastApiResponse } from '@/lib/stewardship/ai-mapper'
import type { Decision, Prescription } from '@/lib/stewardship/types'

interface Store {
  prescriptions: Prescription[]
  decisions: Record<string, Decision>
  selectedId: string | null
}

const initialStore: Store = {
  prescriptions: [],
  decisions: {},
  selectedId: null,
}

const swrOptions = { revalidateOnFocus: false, revalidateIfStale: false, revalidateOnReconnect: false }

export function useReviewStore() {
  const { data, mutate } = useSWR<Store>('stewardship-store-empty-init', () => initialStore, {
    ...swrOptions,
    fallbackData: initialStore,
  })
  const store = data ?? initialStore

  const reviews = useMemo(
    () => (store?.prescriptions ?? []).map(reviewPrescription),
    [store?.prescriptions],
  )

  const update = (fn: (s: Store) => Store) => mutate((prev) => fn(prev ?? initialStore), { revalidate: false })

  return {
    reviews,
    decisions: store?.decisions ?? {},
    selectedId: store?.selectedId ?? null,
    setSelectedId: (id: string | null) => update((s) => ({ ...s, selectedId: id })),

    // Action to add a single prescription to the top and set as active item
    addPrescription: (item: Prescription) =>
      update((s) => ({
        ...s,
        selectedId: item.id,
        prescriptions: [item, ...(s.prescriptions ?? []).filter((p) => p.id !== item.id)],
      })),

    // Action to add multiple prescriptions to the top and set the first as active item
    addPrescriptions: (rows: Prescription[]) =>
      update((s) => {
        const existing = new Set((s.prescriptions ?? []).map((p) => p.id))
        const newRows = (rows ?? []).filter((r) => !existing.has(r.id))
        return {
          ...s,
          selectedId: rows[0]?.id ?? s.selectedId ?? null,
          prescriptions: [...newRows, ...(s.prescriptions ?? [])],
        }
      }),

    // Action to map and add directly from FastAPI /api/analyze-prescription response
    addFromFastApiResponse: (apiResponse: FastApiResponse) => {
      const rows = mapFastApiResponseToPrescriptions(apiResponse)
      update((s) => {
        const existing = new Set((s.prescriptions ?? []).map((p) => p.id))
        const newRows = (rows ?? []).filter((r) => !existing.has(r.id))
        return {
          ...s,
          selectedId: rows[0]?.id ?? s.selectedId ?? null,
          prescriptions: [...newRows, ...(s.prescriptions ?? [])],
        }
      })
      return rows
    },

    decide: (id: string, decision: Omit<Decision, 'decidedAt'>) =>
      update((s) => ({
        ...s,
        decisions: { ...(s.decisions ?? {}), [id]: { ...decision, decidedAt: new Date().toISOString() } },
      })),

    undo: (id: string) =>
      update((s) => {
        const { [id]: _removed, ...rest } = s.decisions ?? {}
        return { ...s, decisions: rest }
      }),
  }
}
