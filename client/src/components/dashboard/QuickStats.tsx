'use client'

import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'

export function QuickStats() {
  const { t } = useTranslation()
  const { organizations, currentOrg } = useOrganization()

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold">
        {t('dashboard.quickStats')}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {organizations.length}
          </p>
          <p className="text-sm text-gray-600">
            {t('dashboard.organizations')}
          </p>
        </div>
        {currentOrg && (
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {currentOrg.member_count}
            </p>
            <p className="text-sm text-gray-600">{t('dashboard.members')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
