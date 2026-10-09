'use client'

import { useRef, useState } from 'react'
import { Download, FileText, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { CSV_TEMPLATE, parsePrescriptionCsv } from '@/lib/stewardship/csv'
import { GUIDELINES } from '@/lib/stewardship/data'
import { mapFastApiResponseToPrescriptions, type FastApiResponse } from '@/lib/stewardship/ai-mapper'
import type { Prescription } from '@/lib/stewardship/types'

const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`
  }
  return 'http://127.0.0.1:8000'
}

interface ParsedFile {
  name: string
  rows: Prescription[]
  errors: string[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (rows: Prescription[]) => void
  mode?: 'image' | 'csv'
  onSwitchToManual?: () => void
}

export function UploadDialog({ open, onOpenChange, onImport, mode = 'image', onSwitchToManual }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name)
  }

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setUploadError(null)

    const fileArray = Array.from(list)

    // Check if any uploaded file is an image
    const imageFiles = fileArray.filter(isImageFile)
    const csvFiles = fileArray.filter((f) => f.name.toLowerCase().endsWith('.csv'))

    // 1. Process image files via FastAPI Gemini backend
    if (imageFiles.length > 0) {
      setIsAnalyzing(true)
      const apiBase = getApiBase()
      try {
        for (const imageFile of imageFiles) {
          const formData = new FormData()
          formData.append('file', imageFile)

          let response: Response
          try {
            // Try relative /api path first (proxied seamlessly through Next.js on port 3000 — bypasses all firewalls & CORS)
            response = await fetch('/api/analyze-prescription', {
              method: 'POST',
              body: formData,
            })
          } catch {
            // Fallback to direct backend URL
            try {
              response = await fetch(`${apiBase}/api/analyze-prescription`, {
                method: 'POST',
                body: formData,
              })
            } catch {
              throw new Error(
                `Could not connect to FastAPI backend at ${apiBase} or /api. Please ensure the backend server is running.`
              )
            }
          }

          if (!response.ok) {
            let errorMsg = `Server error ${response.status}`
            try {
              const errJson = await response.json()
              errorMsg = errJson.detail || errorMsg
            } catch {
              const text = await response.text()
              if (text) errorMsg = text
            }
            throw new Error(errorMsg)
          }

          const apiJson: FastApiResponse = await response.json()
          const mappedRows = mapFastApiResponseToPrescriptions(apiJson)

          if (mappedRows.length > 0) {
            // Import immediately to Review Queue and set as active item
            onImport(mappedRows)
            close(false)
            return
          }
        }
      } catch (err: any) {
        console.error('Prescription image analysis error:', err)
        setUploadError(err.message || 'Failed to analyze prescription image with AI backend.')
      } finally {
        setIsAnalyzing(false)
      }
    }

    // 2. Process CSV files if present
    if (csvFiles.length > 0) {
      const parsed = await Promise.all(
        csvFiles.map(async (file) => {
          const result = parsePrescriptionCsv(await file.text(), file.name)
          return { name: file.name, ...result }
        }),
      )
      setFiles((prev) => [...prev.filter((p) => !parsed.some((n) => n.name === p.name)), ...parsed])
    } else if (imageFiles.length === 0 && fileArray.length > 0) {
      setUploadError('Unsupported file type. Please upload a prescription image (.jpg, .png, .webp) or .csv file.')
    }
  }

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'antibiotic-prescriptions-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const rows = files.flatMap((f) => f.rows)
  const errors = files.flatMap((f) => f.errors)

  const close = (next: boolean) => {
    if (!next) {
      setFiles([])
      setUploadError(null)
      setIsAnalyzing(false)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'csv' ? 'Upload HIS CSV Export' : 'Scan Prescription Pad'}
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
              {mode === 'csv' ? (
                <>
                  <FileText className="size-3" /> Batch CSV
                </>
              ) : (
                <>
                  <Sparkles className="size-3" /> AI Vision Enabled
                </>
              )}
            </span>
          </DialogTitle>
          <DialogDescription>
            {mode === 'csv'
              ? 'Import a Hospital Information System (HIS) CSV file to audit a batch of inpatient and outpatient prescriptions.'
              : 'Upload a prescription photo for instant Gemini AI clinical data extraction and hospital guideline auditing.'}
          </DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          aria-label={mode === 'csv' ? 'Drag and drop CSV file, or click to browse' : 'Drag and drop prescription image, or click to browse'}
          onClick={() => !isAnalyzing && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isAnalyzing && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (!isAnalyzing) handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border bg-card px-6 py-10 text-center transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            dragging && 'border-primary bg-primary/5',
            isAnalyzing && 'cursor-wait opacity-80 pointer-events-none bg-muted/20',
          )}
        >
          {isAnalyzing ? (
            <>
              <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary animate-spin">
                <Loader2 className="size-6" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Analyzing prescription with Gemini AI...</p>
                <p className="text-xs text-muted-foreground">Extracting clinical indications, drugs, AWaRe classes & flags</p>
              </div>
            </>
          ) : (
            <>
              <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
                {mode === 'csv' ? (
                  <FileText className="size-5 text-muted-foreground" aria-hidden />
                ) : (
                  <Upload className="size-5 text-muted-foreground" aria-hidden />
                )}
              </span>
              <p className="text-sm text-muted-foreground">
                {mode === 'csv'
                  ? (files.length ? 'Drag and drop or click to add more CSVs' : 'Drag and drop CSV file, or click to browse')
                  : 'Drag and drop prescription photo (JPG, PNG, WEBP), or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">
                {mode === 'csv'
                  ? 'Supports standard CSV format with patient, indication, and drug columns'
                  : 'Supports clear photos of handwritten or printed prescription pads'}
              </p>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={mode === 'csv' ? '.csv,text/csv' : 'image/*,.png,.jpg,.jpeg,.webp'}
            multiple={mode === 'csv'}
            className="sr-only"
            disabled={isAnalyzing}
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {uploadError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20" role="alert" aria-live="assertive">
            <p className="font-semibold">Analysis Failed</p>
            <p className="mt-1">{uploadError}</p>
          </div>
        )}

        {files.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Selected files">
            {files.map((f) => (
              <li key={f.name} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {f.rows.length} rows{f.errors.length ? ` · ${f.errors.length} errors` : ''}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles((prev) => prev.filter((p) => p.name !== f.name))}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {errors.length > 0 && (
          <div className="max-h-28 overflow-y-auto rounded-lg bg-flag-drug/10 p-3 text-xs text-flag-drug" role="alert">
            <ul className="flex flex-col gap-1">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {mode === 'csv' && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">Accepted indication codes</summary>
            <p className="mt-2 font-mono leading-relaxed">{Object.keys(GUIDELINES).join(', ')}</p>
          </details>
        )}

        <DialogFooter className="sm:justify-between">
          {mode === 'csv' ? (
            <>
              <Button variant="ghost" onClick={downloadTemplate}>
                <Download data-icon="inline-start" />
                CSV template
              </Button>
              <Button
                disabled={!rows.length || isAnalyzing}
                onClick={() => {
                  onImport(rows)
                  close(false)
                }}
              >
                Review {rows.length || ''} {rows.length === 1 ? 'prescription' : 'prescriptions'}
              </Button>
            </>
          ) : (
            <>
              {onSwitchToManual ? (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    close(false)
                    onSwitchToManual()
                  }}
                  className="text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
                >
                  <FileText className="size-3.5 mr-1" />
                  No photo? Enter manually
                </Button>
              ) : (
                <div />
              )}
              <Button variant="outline" type="button" onClick={() => close(false)}>
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
