'use client'

import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { systemAdminService } from '@/services/SystemAdminService'
import { orgRequestService } from '@/services/OrgRequestService'
import { systemAdminCampaignService } from '@/services/SystemAdminCampaignService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useCallback } from 'react'
import type { SystemStats } from '@/types'
import { StatCard } from '@/components/console/StatCard'
import Link from 'next/link'

// Admin overview (docs/ux-restructure-plan.md §2): the review queues ARE
// the job, so they lead — each card links straight into its queue — and
// the platform stats are demoted below. The old flat link list is gone;
// the console sidebar carries those destinations.
export default function AdminPage() {
  const { t } = useTranslation()
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [pendingRequests, setPendingRequests] = useState<number | null>(null)
  const [pendingCampaigns, setPendingCampaigns] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTitle(t('admin.title'))

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    // Surface failures: silently rendering no cards reads as a broken page.
    // Show a friendly notice with a retry instead of the raw RPC error.
    const [statsRes, requestsRes, campaignsRes] = await Promise.all([
      systemAdminService.getSystemStats(),
      orgRequestService.getAllRequests(),
      systemAdminCampaignService.getPendingCampaigns(),
    ])
    if (statsRes.data) setStats(statsRes.data)
    else setError(statsRes.error ?? t('admin.statsError'))
    // Queue counts degrade independently: a failed count shows as —, not
    // as a broken page.
    setPendingRequests(
      requestsRes.data
        ? requestsRes.data.filter(r => r.status === 'pending').length
        : null
    )
    setPendingCampaigns(campaignsRes.data ? campaignsRes.data.length : null)
    setLoading(false)
  }, [t])

  useEffect(() => {
    if (isSystemAdmin) load()
  }, [isSystemAdmin, load])

  if (adminLoading)
    return (
      <ConsoleShell variant="admin">
        <div>{t('common.loading')}</div>
      </ConsoleShell>
    )

  if (!isSystemAdmin) {
    return (
      <ConsoleShell variant="admin">
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('errors.accessDenied')}
          </h1>
          <p className="mt-2 text-gray-600">{t('errors.accessDeniedBody')}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            {t('common.backToHome')}
          </Link>
        </div>
      </ConsoleShell>
    )
  }

  if (loading)
    return (
      <ConsoleShell variant="admin">
        <div>{t('common.loading')}</div>
      </ConsoleShell>
    )

  return (
    <ConsoleShell variant="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('admin.title')}</h1>

        <section aria-label={t('admin.queuesTitle')} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('admin.queuesTitle')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label={t('admin.pendingOrgRequests')}
              value={pendingRequests ?? '—'}
              href="/admin/org-requests"
              tone={pendingRequests ? 'attention' : 'default'}
            />
            <StatCard
              label={t('admin.pendingCampaigns')}
              value={pendingCampaigns ?? '—'}
              href="/admin/campaigns"
              tone={pendingCampaigns ? 'attention' : 'default'}
            />
          </div>
        </section>

        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4"
            role="alert"
          >
            <p className="text-sm text-red-700">{t('admin.statsError')}</p>
            <button
              type="button"
              onClick={load}
              className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              {t('common.tryAgain')}
            </button>
          </div>
        )}
        {stats && (
          <section aria-label={t('admin.title')} className="space-y-3">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-500">{t('admin.statOrgs')}</p>
                <p className="text-2xl font-bold">{stats.total_orgs}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-500">{t('admin.statUsers')}</p>
                <p className="text-2xl font-bold">{stats.total_users}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-500">
                  {t('admin.statMembers')}
                </p>
                <p className="text-2xl font-bold">{stats.total_members}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-500">
                  {t('admin.statSignups')}
                </p>
                <p className="text-2xl font-bold">{stats.recent_signups}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </ConsoleShell>
  )
}
