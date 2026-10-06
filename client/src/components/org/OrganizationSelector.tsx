'use client'

import { useTranslation } from 'react-i18next'
import type { OrganizationView } from '@/types'

/**
 * Modal shown when the user belongs to multiple orgs (or a forced selection is
 * required) and must pick one. Presentational only — selection is delegated to
 * `onSelect`, which performs the real org fetch + storage write.
 */
export function OrganizationSelector({
  organizations,
  onSelect,
  message,
}: {
  organizations: OrganizationView[]
  onSelect: (orgId: string) => void
  message?: string | null
}) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-6 rounded-lg bg-white p-8 shadow">
        <h1 className="text-center text-2xl font-bold">
          {t('selector.title')}
        </h1>
        {message && (
          <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
            {message}
          </div>
        )}
        <p className="text-center text-gray-600">{t('selector.subtitle')}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {organizations.map(org => {
            const isSuspended = org.status === 'suspended'
            return (
              <button
                key={org.id}
                onClick={() => onSelect(org.id)}
                disabled={isSuspended}
                className={`rounded-lg border p-6 text-left transition-colors ${
                  isSuspended
                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60'
                    : 'hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <h2 className="text-lg font-semibold">{org.name}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {org.description ?? t('org.noDescription')}
                </p>
                {isSuspended && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {t('status.suspended')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
