'use client'

import { useEffect } from 'react'
import i18n from '@/i18n/config'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  // Renders its own <html> outside the provider tree, so read the
  // initialized i18n instance directly instead of useTranslation().
  return (
    <html lang={i18n.resolvedLanguage ?? 'en'}>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-md">
            <h1 className="text-xl font-bold text-red-700">
              {i18n.t('errors.somethingWentWrong')}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {error.message || i18n.t('errors.unexpectedError')}
            </p>
            <button
              onClick={reset}
              className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {i18n.t('errors.tryAgain')}
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
