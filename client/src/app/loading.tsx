'use client'

import { useTranslation } from 'react-i18next'

export default function Loading() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">{t('common.loading')}</p>
      </div>
    </div>
  )
}
