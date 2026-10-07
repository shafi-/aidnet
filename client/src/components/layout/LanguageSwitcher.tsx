'use client'

import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/hooks/useLanguage'

// Quiet utility control (DESIGN.md §1: chrome-free, lowest visual weight in
// the bar). Selection = weight/color only; the solid primary fill stays
// reserved for the nav's one call-to-action.
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
              <span className="h-4 w-px bg-border" aria-hidden="true" />
            )}
            <button
              type="button"
              aria-pressed={active}
              className={`whitespace-nowrap text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                active
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
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
