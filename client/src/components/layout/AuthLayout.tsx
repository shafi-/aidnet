'use client'

import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { BrandMark } from '@/components/ui/BrandMark'
import { LanguageSwitcher } from './LanguageSwitcher'

interface AuthLayoutProps {
  children: React.ReactNode
}

// Auth split panel (DESIGN.md §5.3): gradient brand side with the mark and
// trust cues, white form side. Below lg the brand panel hides and a compact
// brand row sits above the form. The language switcher lives here because
// auth pages render no navbar — a visitor landing straight on sign-in must
// still be able to switch.
export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()

  const trustPoints = ['home.how1Title', 'home.how3Title']

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — brand moment: gradient allowed here (§2.1) */}
      <div className="bg-brand-gradient relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <BrandMark size={48} withWordmark />

        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-snug">
            {t('auth.brandLine')}
          </p>
          <ul className="mt-8 space-y-3">
            {trustPoints.map(key => (
              <li
                key={key}
                className="flex items-center gap-3 text-sm text-white/90"
              >
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/70">
          © {new Date().getFullYear()} AidNet
        </p>
      </div>

      {/* Form side */}
      <div className="flex flex-col bg-background">
        <div className="flex items-center justify-between p-5">
          <span className="lg:hidden">
            <BrandMark size={32} withWordmark />
          </span>
          <span className="ml-auto">
            <LanguageSwitcher />
          </span>
        </div>
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  )
}
