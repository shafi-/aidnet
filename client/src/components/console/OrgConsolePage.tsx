'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { OrgGate } from '@/components/org/OrgGate'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { PageHeader } from './PageHeader'
import { NoOrgOnboarding } from './NoOrgOnboarding'

/**
 * Page frame for org workspace routes: auth + console shell + org gate +
 * the contextual no-org onboarding state. Children render only when an org
 * context exists; every org-scoped page composes inside this.
 */
export function OrgConsolePage({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  useRequireAuth()
  const { currentOrg, organizations } = useOrganization()

  return (
    <ConsoleShell variant="workspace">
      <OrgGate>
        {currentOrg ? (
          <div className="space-y-6">
            <PageHeader
              title={title}
              description={description}
              actions={actions}
            />
            {children}
          </div>
        ) : organizations.length === 0 ? (
          <NoOrgOnboarding />
        ) : null}
      </OrgGate>
    </ConsoleShell>
  )
}

/** Card for routes the current role/plan may not use (fail-closed UX). */
export function NoPermission({ body }: { body?: string }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold">
        {t('console.noPermissionTitle')}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {body ?? t('console.noPermissionBody')}
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
      >
        {t('console.backToOverview')}
      </Link>
    </div>
  )
}
