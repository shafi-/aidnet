'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'

export function DashboardCards() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { organizations, currentOrg } = useOrganization()

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* My Organizations */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">
          {t('dashboard.myOrganizations')}
        </h2>
        {organizations.length === 0 ? (
          <p className="mb-4 text-sm text-gray-500">
            {t('dashboard.noOrganizations')}
          </p>
        ) : (
          <div className="space-y-2">
            {organizations.map(org => (
              <div
                key={org.id}
                className={`rounded border p-2 ${currentOrg?.id === org.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <p className="text-sm font-medium">{org.name}</p>
                <p className="text-xs text-gray-500">
                  {t(`roles.${org.user_role}`, {
                    defaultValue: org.user_role,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/orgs"
          className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          {t('dashboard.manageOrganizations')}
        </Link>
      </div>

      {/* Profile Settings */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">
          {t('dashboard.profileSettings')}
        </h2>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">{t('common.emailLabel')}</p>
            <p className="font-medium">{user?.email}</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          {t('dashboard.updateProfile')}
        </Link>
      </div>

      {/* Security */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">
          {t('dashboard.security')}
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          {t('dashboard.manageSecurity')}
        </p>
        <div className="space-y-2">
          <Link
            href="/auth/reset-password/"
            className="block text-sm text-blue-600 hover:text-blue-700"
          >
            {t('dashboard.changePassword')}
          </Link>
        </div>
      </div>
    </div>
  )
}
