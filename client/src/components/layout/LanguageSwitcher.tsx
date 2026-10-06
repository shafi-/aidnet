'use client'

import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/hooks/useLanguage'

const switcherButtonClass = (active: boolean) =>
  `rounded px-2 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
    active
      ? 'bg-indigo-600 text-white'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`

export function LanguageSwitcher() {
  const { t } = useTranslation()
  const { language, setLanguage, languages } = useLanguage()

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex items-center gap-1"
    >
      {languages.map(lang => (
        <button
          key={lang.code}
          type="button"
          aria-pressed={language === lang.code}
          className={switcherButtonClass(language === lang.code)}
          onClick={() => void setLanguage(lang.code)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
