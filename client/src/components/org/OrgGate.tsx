'use client'

import { useOrganization } from '@/hooks/useOrganization'
import { OrganizationSelector } from './OrganizationSelector'

/**
 * Route-level blocker for org-scoped pages: renders the organization
 * selector INSTEAD of the page content until the user picks one. Replaces
 * the former app-wide overlay — public and org-neutral pages are never
 * interrupted, and users with zero organizations never see it (their state
 * is onboarding, handled by the dashboard).
 */
export function OrgGate({ children }: { children: React.ReactNode }) {
  const { selectionRequired, organizations, selectOrgById, suspensionMessage } =
    useOrganization()

  if (!selectionRequired) return <>{children}</>

  return (
    <OrganizationSelector
      organizations={organizations}
      onSelect={selectOrgById}
      message={suspensionMessage}
    />
  )
}
