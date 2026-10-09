'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { systemAdminService } from '@/services/SystemAdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useCallback } from 'react'
import type { SystemStats } from '@/types'
import Link from 'next/link'

export default function AdminPage() {
  const { t } = useTranslation()
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTitle(t('admin.title'))

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    // Surface failures: silently rendering no cards reads as a broken page.
    // Show a friendly notice with a retry instead of the raw RPC error.
    const { data, error: rpcError } = await systemAdminService.getSystemStats()
    if (data) setStats(data)
    else setError(rpcError ?? t('admin.statsError'))
    setLoading(false)
  }, [t])

  useEffect(() => {
    if (isSystemAdmin) load()
  }, [isSystemAdmin, load])

  if (adminLoading)
    return (
      <AppLayout>
        <div>{t('common.loading')}</div>
      </AppLayout>
    )

  if (!isSystemAdmin) {
    return (
      <AppLayout>
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
      </AppLayout>
    )
  }

  if (loading)
    return (
      <AppLayout>
        <div>{t('common.loading')}</div>
      </AppLayout>
    )

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
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
              <p className="text-sm text-gray-500">{t('admin.statMembers')}</p>
              <p className="text-2xl font-bold">{stats.total_members}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-500">{t('admin.statSignups')}</p>
              <p className="text-2xl font-bold">{stats.recent_signups}</p>
            </div>
          </div>
        )}
        <Link href="/admin/orgs" className="text-blue-600 hover:underline">
          {t('admin.manageOrgs')}
        </Link>
        <Link
          href="/admin/plans"
          className="block text-blue-600 hover:underline"
        >
          {t('admin.plansLink')}
        </Link>
        <Link
          href="/admin/subscriptions"
          className="block text-blue-600 hover:underline"
        >
          {t('admin.subsLink')}
        </Link>
      </div>
    </AppLayout>
  )
}
