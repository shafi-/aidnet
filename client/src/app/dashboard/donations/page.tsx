'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useOrgDonationReports } from '@/hooks/useOrgDonationReports'
import {
  OrgConsolePage,
  NoPermission,
} from '@/components/console/OrgConsolePage'
import { OrgReportSection } from '@/components/org/OrgReportRow'
import { usePageTitle } from '@/hooks/usePageTitle'

// Donations (docs/ux-restructure-plan.md §2): answers "who gave?" — the
// cross-campaign ledger, pending queue above the confirmed history. Replaces
// the old per-campaign tab where nothing rendered until a campaign was
// picked from a select.
export default function DonationsPage() {
  const { t } = useTranslation()
  usePageTitle(t('titles.donations'))

  return (
    <OrgConsolePage title={t('console.sections.donations')}>
      <DonationsContent />
    </OrgConsolePage>
  )
}

function DonationsContent() {
  const { t } = useTranslation()
  const { currentOrg } = useOrganization()
  const { isOrgAdmin } = usePermissions()
  const orgId = currentOrg?.id ?? null
  const { campaigns } = useCampaigns(orgId)
  const [campaignFilter, setCampaignFilter] = useState<string>('all')

  const pending = useOrgDonationReports(isOrgAdmin() ? orgId : null, 'pending')
  const confirmed = useOrgDonationReports(
    isOrgAdmin() ? orgId : null,
    'confirmed'
  )

  // Same permission gate the donation RPCs enforce server-side; checked
  // after the hooks so their order never varies between roles.
  if (!isOrgAdmin()) return <NoPermission />

  const inCampaign = (
    reports: ReturnType<typeof useOrgDonationReports>['reports']
  ) =>
    campaignFilter === 'all'
      ? reports
      : reports.filter(report => report.campaign_id === campaignFilter)

  const onConfirm = (id: string) => void pending.confirm(id)
  const onReject = (id: string) => void pending.reject(id)

  return (
    <div className="space-y-6">
      <div
        role="group"
        aria-label={t('donationReport.filterAria')}
        className="flex flex-wrap gap-2"
      >
        <FilterChip
          active={campaignFilter === 'all'}
          onClick={() => setCampaignFilter('all')}
        >
          {t('donationReport.allCampaigns')}
        </FilterChip>
        {campaigns.map(campaign => (
          <FilterChip
            key={campaign.id}
            active={campaignFilter === campaign.id}
            onClick={() => setCampaignFilter(campaign.id)}
          >
            {campaign.title}
          </FilterChip>
        ))}
      </div>

      <OrgReportSection
        heading={t('donationReport.queueTitle')}
        reports={inCampaign(pending.reports)}
        loading={pending.loading}
        error={pending.error}
        errorText={t('dashboard.queueError')}
        emptyText={t('donationReport.emptyQueue')}
        reviewable
        onConfirm={onConfirm}
        onReject={onReject}
      />

      <OrgReportSection
        heading={t('donationReport.confirmedTitle')}
        reports={inCampaign(confirmed.reports)}
        loading={confirmed.loading}
        error={confirmed.error}
        errorText={t('dashboard.queueError')}
        emptyText={t('donationReport.emptyConfirmed')}
      />
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
          : 'bg-card text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}
