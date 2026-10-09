'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, FlaskConical, ListChecks, Menu, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ANTIBIOGRAM_PERIOD } from '@/lib/stewardship/data'

export type View = 'queue' | 'antibiogram' | 'guidelines'

const NAV: { view: View; label: string; icon: typeof ListChecks; hint: string }[] = [
  { view: 'queue', label: 'Review queue', icon: ListChecks, hint: 'Flagged prescriptions awaiting a decision' },
  { view: 'antibiogram', label: 'Local antibiogram', icon: FlaskConical, hint: `Susceptibility, ${ANTIBIOGRAM_PERIOD}` },
  { view: 'guidelines', label: 'Treatment guidelines', icon: BookOpen, hint: 'Hospital empiric therapy policy' },
]

export function AppHeader({
  onNavigate,
  onUpload,
  onNew,
  onManual,
}: {
  onNavigate: (v: View) => void
  onUpload: () => void
  onNew: () => void
  onManual?: () => void
}) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          onClick={() => window.location.reload()}
          className="flex items-center gap-3 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg cursor-pointer py-1"
        >
          <div className="relative flex h-10 w-[48px] shrink-0 items-center justify-center">
            <Image
              src="/logo-transparent.png"
              alt="Attend.to Logo"
              width={48}
              height={40}
              className="h-full w-full object-contain brand-logo-light"
              priority
            />
            <Image
              src="/logo-white.png"
              alt="Attend.to Logo"
              width={48}
              height={40}
              className="h-full w-full object-contain brand-logo-dark"
              priority
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[21px] font-extrabold tracking-tight text-foreground leading-tight">
              Attend.to
            </span>
            <span className="hidden text-xs font-medium text-muted-foreground leading-tight sm:block">
              Antimicrobial stewardship · Pharmacy
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open navigation" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Navigate</SheetTitle>
                <SheetDescription>Review prescriptions and reference the hospital policy.</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV.map(({ view, label, icon: Icon, hint }) => (
                  <SheetClose
                    key={view}
                    render={
                      <button
                        type="button"
                        onClick={() => onNavigate(view)}
                        className="flex items-start gap-3 rounded-lg p-3 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      />
                    }
                  >
                    <Icon className="mt-0.5 size-4 text-muted-foreground" />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Button variant="outline" onClick={onUpload} aria-label="Upload prescriptions">
            <Upload data-icon="inline-start" />
            <span className="hidden sm:inline">Upload CSV</span>
          </Button>
          {onManual && (
            <Button variant="outline" onClick={onManual} aria-label="Manual prescription entry">
              <BookOpen data-icon="inline-start" className="size-3.5" />
              <span className="hidden sm:inline">Manual Entry</span>
            </Button>
          )}
          <Button onClick={onNew} aria-label="Scan prescription photo">
            <Plus data-icon="inline-start" />
            AI Scan
          </Button>
        </div>
      </div>
    </header>
  )
}
