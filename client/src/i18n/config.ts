import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import bn from './locales/bn.json'

export const STORAGE_KEY = 'donate.language'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === 'en' || value === 'bn'
}

// Resolution order: saved preference → browser language → English.
export function detectLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isLanguageCode(stored)) return stored
  return navigator.language.toLowerCase().startsWith('bn') ? 'bn' : 'en'
}

// The app is a client-only static export: one global instance, initialised
// at import time. Components use useTranslation(); switching goes through
// persistLanguage so the choice survives reloads.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
}

export function persistLanguage(language: LanguageCode) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, language)
  }
  return i18n.changeLanguage(language)
}

export default i18n
