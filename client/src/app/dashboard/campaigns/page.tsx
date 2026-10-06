'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { useCampaigns } from '@/hooks/useCampaigns'
import { usePermissions } from '@/hooks/usePermissions'
import { AppLayout } from '@/components/layout/AppLayout'
import { OrgGate } from '@/components/org/OrgGate'
import { usePageTitle } from '@/hooks/usePageTitle'

function DashboardCampaignsContent() {
  const { t } = useTranslation()
  const { currentOrg } = useOrganization()
  const { hasPermission } = usePermissions()
  const { campaigns, loading, error, submit, remove } = useCampaigns(
    currentOrg?.id
  )

  usePageTitle(t('dashboardCampaigns.title'))

  if (!currentOrg) {
    return (
      <AppLayout>
        <OrgGate>
          <div className="mx-auto max-w-7xl px-4 py-8">
            <p className="text-gray-600">{t('dashboardCampaigns.selectOrg')}</p>
            <Link href="/orgs" className="text-indigo-600 hover:underline">
              {t('dashboardCampaigns.goToOrgs')}
            </Link>
          </div>
        </OrgGate>
      </AppLayout>
    )
  }

  const canCreate = hasPermission('campaigns:create')

  return (
    <AppLayout>
      <OrgGate>
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('dashboardCampaigns.title')}
              </h1>
              <p className="text-gray-500">{currentOrg.name}</p>
            </div>
            {canCreate && (
              <Link
                href="/dashboard/campaigns/new"
                className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
              >
                {t('dashboardCampaigns.new')}
              </Link>
            )}
          </div>

          {loading && (
            <div className="py-8 text-gray-500">{t('common.loading')}</div>
          )}
          {error && <div className="py-8 text-red-600">{error}</div>}

          {!loading && !error && campaigns.length === 0 && (
            <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
              {t('dashboardCampaigns.empty')}{' '}
              {canCreate && (
                <Link
                  href="/dashboard/campaigns/new"
                  className="text-indigo-600 hover:underline"
                >
                  {t('dashboardCampaigns.createFirst')}
                </Link>
              )}
            </div>
          )}

          {!loading && !error && campaigns.length > 0 && (
            <div className="divide-y rounded-lg bg-white shadow">
              {campaigns.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {c.title}
                      </span>
                      <StatusBadge status={c.status} />
                      {c.is_zakat_eligible && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          {t('campaignCard.zakatBadge')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">/{c.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === 'draft' || c.status === 'rejected' ? (
                      <button
                        onClick={() => submit(c.id)}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                      >
                        {t('dashboardCampaigns.submitReview')}
                      </button>
                    ) : null}
                    <Link
                      href={`/dashboard/campaigns/edit?id=${c.id}`}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {t('common.edit')}
                    </Link>
                    {hasPermission('campaigns:delete') &&
                      c.status !== 'live' && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                t('dashboardCampaigns.deleteConfirm', {
                                  title: c.title,
                                })
                              )
                            )
                              remove(c.id)
                          }}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </OrgGate>
    </AppLayout>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation()
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_review: 'bg-yellow-100 text-yellow-800',
    live: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    closed: 'bg-gray-200 text-gray-600',
  }
  const value = status ?? 'draft'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${map[value] ?? map.draft}`}
    >
      {t(`status.${value}`, { defaultValue: value })}
    </span>
  )
}

export default function DashboardCampaignsPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="py-12 text-center text-gray-500">
            {t('common.loading')}
          </div>
        </AppLayout>
      }
    >
      <DashboardCampaignsContent />
    </Suspense>
  )
}
