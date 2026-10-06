'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDonationReports } from '@/hooks/useDonationReports'
import { useCampaigns } from '@/hooks/useCampaigns'
import type { DonationReport } from '@/types'

/**
 * Org-side review queue for donor-reported donations, grouped by campaign:
 * pending reports become confirmed (counted toward the public raised total)
 * or rejected. Reports arrive from the public "I donated" flow and are never
 * counted until an org admin confirms them here.
 */
export function DonationsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const { campaigns } = useCampaigns(orgId)
  const [campaignId, setCampaignId] = useState<string>('')
  const { pending, confirmed, loading, error, confirm, reject } =
    useDonationReports(campaignId || null)

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="donations-campaign"
          className="block text-sm font-medium text-gray-700"
        >
          {t('donationReport.selectCampaign')}
        </label>
        <select
          id="donations-campaign"
          value={campaignId}
          onChange={e => setCampaignId(e.target.value)}
          className="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">
            {t('donationReport.selectCampaignPlaceholder')}
          </option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {!campaignId ? (
        <p className="text-sm text-gray-500">
          {t('donationReport.selectCampaignHint')}
        </p>
      ) : loading ? (
        <div>{t('common.loading')}</div>
      ) : (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('donationReport.queueTitle')}
            </h3>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t('donationReport.emptyQueue')}
              </p>
            ) : (
              pending.map(r => (
                <ReportRow
                  key={r.id}
                  r={r}
                  onConfirm={confirm}
                  onReject={reject}
                  reviewable
                />
              ))
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('donationReport.confirmedTitle')}
            </h3>
            {confirmed.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t('donationReport.emptyConfirmed')}
              </p>
            ) : (
              confirmed.map(r => <ReportRow key={r.id} r={r} />)
            )}
          </section>
        </>
      )}
    </div>
  )
}

function ReportRow({
  r,
  onConfirm,
  onReject,
  reviewable = false,
}: {
  r: DonationReport
  onConfirm?: (id: string) => void
  onReject?: (id: string) => void
  reviewable?: boolean
}) {
  const { t } = useTranslation()
  const date = new Date(r.created_at).toLocaleDateString()
  const reference = r.reference
    ? ` · ${t('donationReport.reference')}: ${r.reference}`
    : ''

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">
            {r.currency} {r.amount.toLocaleString()} · {r.method}
            {r.donor_name ? ` · ${r.donor_name}` : ''}
          </p>
          <p className="text-sm text-gray-500">
            {date}
            {reference}
          </p>
          {r.message && (
            <p className="mt-1 text-sm text-gray-600">{r.message}</p>
          )}
        </div>
        {reviewable && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onConfirm?.(r.id)}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
            >
              {t('donationReport.confirm')}
            </button>
            <button
              type="button"
              onClick={() => onReject?.(r.id)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              {t('donationReport.reject')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
