'use client'

import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { systemAdminSubscriptionService } from '@/services/SystemAdminSubscriptionService'
import { orgSubscriptionService } from '@/services/OrgSubscriptionService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useCallback } from 'react'
import type {
  OrganizationSubscriptionView,
  SubscriptionHistoryView,
} from '@/types'
import Link from 'next/link'

export default function AdminSubscriptionsPage() {
  const { t } = useTranslation()
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [subscriptions, setSubscriptions] = useState<
    OrganizationSubscriptionView[]
  >([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [history, setHistory] = useState<SubscriptionHistoryView[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  usePageTitle(t('admin.subsLink'))

  const loadSubscriptions = useCallback(async () => {
    const { data } = await systemAdminSubscriptionService.getOrgSubscriptions()
    if (data) setSubscriptions(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) loadSubscriptions()
  }, [isSystemAdmin, loadSubscriptions])

  const loadHistory = async (orgId: string) => {
    setSelectedOrg(orgId)
    setHistoryLoading(true)
    const { data } = await orgSubscriptionService.getHistory(orgId)
    if (data) setHistory(data)
    setHistoryLoading(false)
  }

  const handlePause = async (orgId: string) => {
    await systemAdminSubscriptionService.pauseSubscription(orgId)
    loadSubscriptions()
  }

  const handleUnpause = async (orgId: string) => {
    await systemAdminSubscriptionService.unpauseSubscription(orgId)
    loadSubscriptions()
  }

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

  return (
    <ConsoleShell variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.subsLink')}</h1>
        </div>

        {loading ? (
          <div>{t('common.loading')}</div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('admin.headerOrganization')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('common.planLabel')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('common.statusLabel')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('admin.headerPeriod')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('admin.headerPrice')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('admin.headerRenewal')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('common.actionsLabel')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{sub.org_name}</td>
                    <td className="px-4 py-3">{sub.plan_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          sub.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : sub.status === 'paused'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {t(`status.${sub.status}`, {
                          defaultValue: sub.status,
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t(`billing.${sub.billing_period}`, {
                        defaultValue: sub.billing_period,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      $
                      {sub.billing_period === 'yearly'
                        ? sub.price_yearly
                        : sub.price_monthly}
                      {sub.billing_period === 'yearly'
                        ? t('billing.perYearShort')
                        : t('billing.perMonthShort')}
                    </td>
                    <td className="px-4 py-3">
                      {sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadHistory(sub.organization_id)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {t('billing.history')}
                        </button>
                        {sub.status === 'active' ? (
                          <button
                            onClick={() => handlePause(sub.organization_id)}
                            className="text-sm text-orange-600 hover:underline"
                          >
                            {t('status.paused')}
                          </button>
                        ) : sub.status === 'paused' ? (
                          <button
                            onClick={() => handleUnpause(sub.organization_id)}
                            className="text-sm text-green-600 hover:underline"
                          >
                            {t('status.active')}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {t('billing.noSubscription')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedOrg && (
          <div className="space-y-4 rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('billing.history')}</h2>
              <button
                onClick={() => setSelectedOrg(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {historyLoading ? (
              <div>{t('common.loading')}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      {t('common.dateLabel')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      {t('billing.action')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      {t('common.planLabel')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      {t('common.amountLabel')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      {t('common.statusLabel')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      {t('common.notesLabel')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map(h => (
                    <tr key={h.id}>
                      <td className="px-4 py-3">
                        {new Date(h.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 capitalize">{h.action}</td>
                      <td className="px-4 py-3">{h.plan_name}</td>
                      <td className="px-4 py-3">${h.amount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            h.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : h.payment_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t(`status.${h.payment_status}`, {
                            defaultValue: h.payment_status,
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {h.notes || '-'}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        {t('billing.noHistory')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </ConsoleShell>
  )
}
