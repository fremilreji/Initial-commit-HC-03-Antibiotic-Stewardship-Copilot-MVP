'use client'

import * as React from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  warning: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    return {
      toast: (msg) => console.log('Toast:', msg),
      success: (msg) => console.log('Toast success:', msg),
      warning: (msg) => console.log('Toast warning:', msg),
      error: (msg) => console.log('Toast error:', msg),
      info: (msg) => console.log('Toast info:', msg),
    }
  }
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const addToast = React.useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast: (msg, type = 'success') => addToast(msg, type),
      success: (msg) => addToast(msg, 'success'),
      warning: (msg) => addToast(msg, 'warning'),
      error: (msg) => addToast(msg, 'error'),
      info: (msg) => addToast(msg, 'info'),
    }),
    [addToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3',
              t.type === 'success' && 'bg-card/95 border-success/40 text-card-foreground',
              t.type === 'warning' && 'bg-card/95 border-flag-dose/40 text-card-foreground',
              t.type === 'error' && 'bg-card/95 border-destructive/40 text-card-foreground',
              t.type === 'info' && 'bg-card/95 border-primary/40 text-card-foreground',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {t.type === 'success' && <CheckCircle2 className="size-4 shrink-0 text-success" />}
              {t.type === 'warning' && <AlertTriangle className="size-4 shrink-0 text-flag-dose" />}
              {t.type === 'error' && <AlertTriangle className="size-4 shrink-0 text-destructive" />}
              {t.type === 'info' && <Info className="size-4 shrink-0 text-primary" />}
              <p className="text-sm font-medium leading-snug break-words">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
