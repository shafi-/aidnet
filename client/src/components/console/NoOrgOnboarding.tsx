'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'

/**
 * Contextual onboarding for console pages when the user has no organization
 * at all — replaces the old always-on "Get started" dashboard card. Users
 * with organizations but no selection see the OrgGate selector instead.
 */
export function NoOrgOnboarding() {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm">
      <h1 className="text-xl font-semibold">
        {t('dashboard.getStartedTitle')}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t('dashboard.getStartedBody')}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/campaigns"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('dashboard.browseCampaigns')}
        </Link>
        <Link
          href="/org/request"
          className="inline-flex items-center rounded-md border bg-card px-4 py-2.5 font-medium hover:border-primary/40"
        >
          {t('dashboard.createOrganization')}
        </Link>
        <Link
          href="/invite"
          className="inline-flex items-center rounded-md border bg-card px-4 py-2.5 font-medium hover:border-primary/40"
        >
          {t('dashboard.joinOrganization')}
        </Link>
      </div>
    </div>
  )
}
