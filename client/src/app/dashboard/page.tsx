'use client'

import { useRequireAuth, useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { OrgDashboard } from '@/components/org/OrgDashboard'
import { DashboardCards } from '@/components/dashboard/DashboardCards'
import { QuickStats } from '@/components/dashboard/QuickStats'
import { AppLayout } from '@/components/layout/AppLayout'
import { OrgGate } from '@/components/org/OrgGate'
import { useProfile } from '@/hooks/useProfile'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'

export default function DashboardPage() {
  useRequireAuth()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { currentOrg, organizations } = useOrganization()
  const { fullName } = useProfile()
  usePageTitle(t('titles.dashboard'))

  return (
    <AppLayout>
      <OrgGate>
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
            {user && (
              <p className="text-gray-600">
                {fullName
                  ? t('dashboard.welcomeBackName', { name: fullName })
                  : t('dashboard.welcomeBack')}
              </p>
            )}
          </div>

          {/* No org at all: onboarding, not a warning */}
          {!currentOrg && organizations.length === 0 && (
            <div className="rounded-lg border border-indigo-100 bg-white p-6 shadow">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                {t('dashboard.getStartedTitle')}
              </h2>
              <p className="mb-4 text-gray-600">
                {t('dashboard.getStartedBody')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/campaigns"
                  className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                >
                  {t('dashboard.browseCampaigns')}
                </Link>
                <Link
                  href="/org/request"
                  className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:border-indigo-400 hover:text-indigo-600"
                >
                  {t('dashboard.createOrganization')}
                </Link>
                <Link
                  href="/invite"
                  className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:border-indigo-400 hover:text-indigo-600"
                >
                  {t('dashboard.joinOrganization')}
                </Link>
              </div>
            </div>
          )}

          {/* Security: Show suspension message if current org is suspended */}
          {currentOrg && currentOrg.status === 'suspended' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <h2 className="mb-2 text-lg font-semibold text-red-900">
                {t('dashboard.suspendedTitle')}
              </h2>
              <p className="mb-4 text-red-800">
                {t('dashboard.suspendedBody', { name: currentOrg.name })}
              </p>
              <p className="text-sm text-red-700">
                {t('dashboard.suspendedContact')}
              </p>
            </div>
          )}

          <QuickStats />
          <DashboardCards />
          {currentOrg && currentOrg.status === 'active' && <OrgDashboard />}
        </div>
      </OrgGate>
    </AppLayout>
  )
}
