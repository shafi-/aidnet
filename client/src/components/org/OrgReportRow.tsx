'use client'

import { useTranslation } from 'react-i18next'
import type { OrgDonationReport } from '@/types'

/**
 * One donor-reported donation in an org console list: ledger facts first
 * (amount, method, donor, campaign, date, reference), review actions when
 * the row is pending. Confirm moves the public raised total; reject does
 * not. Touch targets meet the 44px floor (DESIGN.md §2.6).
 */
export function OrgReportRow({
  report,
  reviewable = false,
  onConfirm,
  onReject,
}: {
  report: OrgDonationReport
  reviewable?: boolean
  onConfirm?: (id: string) => void
  onReject?: (id: string) => void
}) {
  const { t } = useTranslation()
  const date = new Date(report.created_at).toLocaleDateString()

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">
          {report.currency} {report.amount.toLocaleString()} · {report.method}
          {report.donor_name ? ` · ${report.donor_name}` : ''}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {report.campaign_title} · {date}
          {report.reference
            ? ` · ${t('donationReport.reference')}: ${report.reference}`
            : ''}
        </p>
        {report.message && (
          <p className="mt-1 text-sm text-muted-foreground">{report.message}</p>
        )}
      </div>
      {reviewable && (
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={() => onConfirm?.(report.id)}
            className="min-h-11 rounded-md bg-success px-4 py-2.5 text-sm font-medium text-success-foreground hover:bg-success/90"
          >
            {t('donationReport.confirm')}
          </button>
          <button
            type="button"
            onClick={() => onReject?.(report.id)}
            className="min-h-11 rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            {t('donationReport.reject')}
          </button>
        </div>
      )}
    </li>
  )
}

/** Titled list of org donation reports with one loading/empty/error state. */
export function OrgReportSection({
  heading,
  action,
  reports,
  loading,
  error,
  errorText,
  emptyText,
  reviewable = false,
  onConfirm,
  onReject,
}: {
  heading: string
  /** Optional link/button rendered at the right of the section header. */
  action?: React.ReactNode
  reports: OrgDonationReport[]
  loading: boolean
  error: string | null
  errorText: string
  emptyText: string
  reviewable?: boolean
  onConfirm?: (id: string) => void
  onReject?: (id: string) => void
}) {
  const { t } = useTranslation()

  return (
    <section
      aria-label={heading}
      className="rounded-lg border bg-card shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-semibold">{heading}</h2>
        {action}
      </div>

      {error && (
        <p role="alert" className="px-4 py-3 text-sm text-destructive">
          {errorText}
        </p>
      )}

      {loading ? (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : reports.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y">
          {reports.map(report => (
            <OrgReportRow
              key={report.id}
              report={report}
              reviewable={reviewable}
              onConfirm={onConfirm}
              onReject={onReject}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
