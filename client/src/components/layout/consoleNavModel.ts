// Pure nav structure for the console shell (docs/ux-restructure-plan.md §2):
// sidebar sections are routes, one level deep — no nested tabs anywhere.
// Visibility follows the same gating the old tabs enforced: org-admin for
// donations, plan features for members/settings, org-owner for billing.
// Labels are i18n keys; the shell renders them through t(). No React, no
// hooks — fully unit-testable.

import type { NavLinkItem } from './navModel'
import { isHrefActiveAmong } from './navModel'

export type ConsoleVariant = 'workspace' | 'admin'

export interface ConsoleSectionInput {
  isOrgAdmin: boolean
  isOrgOwner: boolean
  /** Plan feature check, e.g. f => f('members'); always true for admin. */
  hasFeature: (feature: string) => boolean
}

export function buildWorkspaceSections(
  input: ConsoleSectionInput
): NavLinkItem[] {
  const { isOrgAdmin, isOrgOwner, hasFeature } = input
  return [
    { href: '/dashboard', label: 'console.sections.overview' },
    { href: '/dashboard/campaigns', label: 'console.sections.campaigns' },
    ...(isOrgAdmin
      ? [{ href: '/dashboard/donations', label: 'console.sections.donations' }]
      : []),
    ...(hasFeature('members')
      ? [{ href: '/dashboard/members', label: 'console.sections.members' }]
      : []),
    ...(isOrgOwner
      ? [{ href: '/dashboard/billing', label: 'console.sections.billing' }]
      : []),
    ...(isOrgAdmin && hasFeature('settings')
      ? [{ href: '/dashboard/settings', label: 'console.sections.settings' }]
      : []),
  ]
}

export const ADMIN_SECTIONS: NavLinkItem[] = [
  { href: '/admin', label: 'console.adminSections.overview' },
  { href: '/admin/campaigns', label: 'console.adminSections.campaigns' },
  { href: '/admin/org-requests', label: 'console.adminSections.orgRequests' },
  { href: '/admin/orgs', label: 'console.adminSections.orgs' },
  { href: '/admin/plans', label: 'console.adminSections.plans' },
  {
    href: '/admin/subscriptions',
    label: 'console.adminSections.subscriptions',
  },
]

export function buildConsoleSections(
  variant: ConsoleVariant,
  input?: ConsoleSectionInput
): NavLinkItem[] {
  if (variant === 'admin') return ADMIN_SECTIONS
  return buildWorkspaceSections(
    input ?? { isOrgAdmin: false, isOrgOwner: false, hasFeature: () => false }
  )
}

export function isConsoleSectionActive(
  sections: NavLinkItem[],
  href: string,
  pathname: string
): boolean {
  return isHrefActiveAmong(
    sections.map(section => section.href),
    href,
    pathname
  )
}
