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

export function AppHeader({ onNavigate, onUpload, onNew }: { onNavigate: (v: View) => void; onUpload: () => void; onNew: () => void }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg cursor-pointer"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-card border border-border/80 shadow-xs overflow-hidden p-1">
            <Image
              src="/logo-transparent.png"
              alt="Stewardship Desk Logo"
              width={28}
              height={28}
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/logo-white.png"
              alt="Stewardship Desk Logo"
              width={28}
              height={28}
              className="object-contain hidden dark:block"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight">Stewardship Desk</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Antimicrobial stewardship · Pharmacy</p>
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
          <Button onClick={onNew}>
            <Plus data-icon="inline-start" />
            New prescription
          </Button>
        </div>
      </div>
    </header>
  )
}
