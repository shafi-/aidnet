'use client'

import { useTranslation } from 'react-i18next'
import { useBilling, type BillingController } from '@/hooks/useBilling'

// Plan features arrive from the database as machine keys ("todos",
// "members", ...); label them through i18n and fall back to the raw key for
// values added later.
function FeatureChip({ label }: { label: string }) {
  const { t } = useTranslation()
  return (
    <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
      {t(`features.${label}`, { defaultValue: label })}
    </span>
  )
}

export function BillingTab({
  orgId,
  isOwner,
}: {
  orgId: string
  isOwner: boolean
}) {
  const controller = useBilling(orgId)
  return <BillingTabView controller={controller} isOwner={isOwner} />
}

export function BillingTabView({
  controller,
  isOwner,
}: {
  controller: BillingController
  isOwner: boolean
}) {
  const { t } = useTranslation()
  const {
    currentPlan,
    plans,
    history,
    loading,
    purchasing,
    billingPeriod,
    setBillingPeriod,
    subscribe,
    changePlan,
    cancel,
  } = controller

  if (loading)
    return (
      <div className="py-8 text-center text-gray-500">
        {t('common.loading')}
      </div>
    )

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">
          {t('billing.currentPlan')}
        </h3>
        {currentPlan ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">
                {currentPlan.plan_name}
              </span>
              <span
                className={`rounded px-2 py-1 text-xs ${
                  currentPlan.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : currentPlan.status === 'paused'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {t(`status.${currentPlan.status}`, {
                  defaultValue: currentPlan.status,
                })}
              </span>
            </div>
            <p className="text-gray-600">{currentPlan.description}</p>
            <div className="text-sm text-gray-500">
              $
              {currentPlan.billing_period === 'yearly'
                ? currentPlan.price_yearly
                : currentPlan.price_monthly}
              {currentPlan.billing_period === 'yearly'
                ? t('billing.perYear')
                : t('billing.perMonth')}
            </div>
            <div className="text-sm text-gray-500">
              {t('billing.renews', {
                date: new Date(
                  currentPlan.current_period_end
                ).toLocaleDateString(),
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(currentPlan.features || []).map(f => (
                <FeatureChip key={f} label={f} />
              ))}
            </div>
            {isOwner && (
              <button
                onClick={cancel}
                className="mt-4 text-sm text-red-600 hover:underline"
              >
                {t('billing.cancelSubscription')}
              </button>
            )}
          </div>
        ) : (
          <p className="text-gray-500">{t('billing.noSubscription')}</p>
        )}
      </div>

      {/* Available Plans */}
      {isOwner && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">
            {t('billing.availablePlans')}
          </h3>
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`rounded px-3 py-1 text-sm ${billingPeriod === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              {t('billing.monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`rounded px-3 py-1 text-sm ${billingPeriod === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              {t('billing.yearly')}
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {plans
              .filter(p => p.is_active)
              .map(plan => {
                const isCurrent = currentPlan?.plan_id === plan.id
                const price =
                  billingPeriod === 'yearly'
                    ? plan.price_yearly
                    : plan.price_monthly
                return (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-4 ${isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <h4 className="font-semibold">{plan.name}</h4>
                    <p className="mt-2 text-2xl font-bold">
                      ${price}
                      <span className="text-sm font-normal">
                        {billingPeriod === 'yearly'
                          ? t('billing.perYearShort')
                          : t('billing.perMonthShort')}
                      </span>
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {plan.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(plan.features || []).map(f => (
                        <span
                          key={f}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                        >
                          {t(`features.${f}`, { defaultValue: f })}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4">
                      {isCurrent ? (
                        <span className="text-sm text-blue-600">
                          {t('billing.currentPlan')}
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            currentPlan
                              ? changePlan(plan.id)
                              : subscribe(plan.id)
                          }
                          disabled={purchasing === plan.id}
                          className="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {purchasing === plan.id
                            ? t('billing.processing')
                            : t('billing.payNow')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">{t('billing.history')}</h3>
        {history.length > 0 ? (
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
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-4 text-center text-gray-500">
            {t('billing.noHistory')}
          </p>
        )}
      </div>
    </div>
  )
}
