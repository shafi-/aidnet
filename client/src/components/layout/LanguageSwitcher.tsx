'use client'

import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/hooks/useLanguage'

// Quiet utility control (DESIGN.md §1): chrome-free text pair, lowest
// visual weight in whatever bar hosts it. Color-agnostic on purpose —
// it inherits the surface's text color (navbar, gradient brand panel) —
// selection reads as weight/opacity only, so the solid primary fill stays
// reserved for call-to-action buttons.
export function LanguageSwitcher() {
  const { t } = useTranslation()
  const { language, setLanguage, languages } = useLanguage()

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex items-center gap-2"
    >
      {languages.map((lang, index) => {
        const active = language === lang.code
        return (
          <Fragment key={lang.code}>
            {index > 0 && (
              <span
                className="h-4 w-px bg-current opacity-30"
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              aria-pressed={active}
              className={`whitespace-nowrap text-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                active
                  ? 'font-medium text-current'
                  : 'text-current opacity-60 hover:opacity-100'
              }`}
              onClick={() => void setLanguage(lang.code)}
            >
              {lang.label}
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}
