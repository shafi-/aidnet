// Pure nav structure (DESIGN.md §5.1): order and grouping follow each
// audience's primary job. Labels are i18n keys; the caller renders them
// through t(). No React, no hooks — fully unit-testable.
//
// System administration is a single "Admin" entry here: the admin
// destinations themselves live in the admin console's sidebar
// (consoleNavModel.ts), so the public nav no longer duplicates them.

export interface NavLinkItem {
  href: string
  /** i18n key */
  label: string
}

export type NavMenuItem =
  { kind: 'link'; href: string; label: string } | { kind: 'organizations-menu' }

export interface NavOrganizationsMenu {
  /** Current org context row; null when the user has no organization. */
  contextOrgName: string | null
  items: NavLinkItem[]
}

export interface NavDrawerGroup {
  /** i18n key for the section label, or null for the unlabeled primary group */
  label: string | null
  links: NavLinkItem[]
}

export interface NavModel {
  items: NavMenuItem[]
  organizationsMenu: NavOrganizationsMenu | null
  drawerGroups: NavDrawerGroup[]
}

export interface NavModelInput {
  user: { email: string } | null
  currentOrg: { name: string } | null
  isSystemAdmin: boolean
}

const ADMIN_LINK: NavLinkItem = { href: '/admin', label: 'nav.admin' }

export function buildNavModel(input: NavModelInput): NavModel {
  const { user, currentOrg, isSystemAdmin } = input

  // Anonymous visitors: discovery is their only job, so Campaigns is the
  // single primary link (DESIGN.md — Dashboard stays hidden and guarded).
  if (!user) {
    return {
      items: [{ kind: 'link', href: '/campaigns', label: 'nav.campaigns' }],
      organizationsMenu: null,
      drawerGroups: [
        {
          label: null,
          links: [{ href: '/campaigns', label: 'nav.campaigns' }],
        },
      ],
    }
  }

  // Members without an organization are still discovery-first users, but
  // they can start fundraising as individuals — /dashboard/campaigns/new
  // lazily provisions their personal org (create-as-individual CTA).
  if (!currentOrg) {
    return {
      items: [
        { kind: 'link', href: '/campaigns', label: 'nav.campaigns' },
        ...(isSystemAdmin ? [{ kind: 'link' as const, ...ADMIN_LINK }] : []),
        {
          kind: 'link',
          href: '/dashboard/campaigns/new',
          label: 'nav.startCampaign',
        },
        { kind: 'organizations-menu' },
        { kind: 'link', href: '/dashboard', label: 'nav.dashboard' },
      ],
      organizationsMenu: {
        contextOrgName: null,
        items: [
          { href: '/orgs', label: 'nav.browseOrgs' },
          { href: '/org/request', label: 'nav.requestOrg' },
        ],
      },
      drawerGroups: [
        {
          label: null,
          links: [
            { href: '/campaigns', label: 'nav.campaigns' },
            { href: '/dashboard/campaigns/new', label: 'nav.startCampaign' },
            { href: '/orgs', label: 'nav.organizations' },
            { href: '/org/request', label: 'nav.requestOrg' },
            { href: '/dashboard', label: 'nav.dashboard' },
            ...(isSystemAdmin ? [ADMIN_LINK] : []),
          ],
        },
      ],
    }
  }

  // Operators (org members, org admins, system admins): the workspace leads
  // — Dashboard, then the org's own campaigns; public discovery is demoted
  // to a quiet trailing "Discover" link but stays one click away.
  return {
    items: [
      { kind: 'link', href: '/dashboard', label: 'nav.dashboard' },
      ...(isSystemAdmin ? [{ kind: 'link' as const, ...ADMIN_LINK }] : []),
      { kind: 'link', href: '/dashboard/campaigns', label: 'nav.orgCampaigns' },
      { kind: 'organizations-menu' },
      { kind: 'link', href: '/campaigns', label: 'nav.discover' },
    ],
    organizationsMenu: {
      contextOrgName: currentOrg.name,
      items: [{ href: '/orgs', label: 'nav.browseOrgs' }],
    },
    drawerGroups: [
      {
        label: null,
        links: [
          { href: '/dashboard', label: 'nav.dashboard' },
          { href: '/dashboard/campaigns', label: 'nav.orgCampaigns' },
          { href: '/orgs', label: 'nav.organizations' },
          { href: '/campaigns', label: 'nav.discover' },
          ...(isSystemAdmin ? [ADMIN_LINK] : []),
        ],
      },
    ],
  }
}

/** Every href that appears anywhere in the model (top level, menus, drawer). */
function navModelHrefs(model: NavModel): string[] {
  const links: NavLinkItem[] = model.items.filter(
    (item): item is Extract<NavMenuItem, { kind: 'link' }> =>
      item.kind === 'link'
  )
  links.push(...(model.organizationsMenu?.items ?? []))
  for (const group of model.drawerGroups) links.push(...group.links)
  return links.map(link => link.href)
}

function matchesPath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Longest-match wins: on /dashboard/campaigns only "Our campaigns" is
 * active — "Dashboard" is also a path prefix, but a strictly longer link
 * matches the same pathname, so it must not light up. Shared by the top
 * nav model and the console sidebar model.
 */
export function isHrefActiveAmong(
  hrefs: string[],
  href: string,
  pathname: string
): boolean {
  if (!matchesPath(href, pathname)) return false
  return !hrefs.some(
    other =>
      other !== href &&
      other.startsWith(href) &&
      other.length > href.length &&
      matchesPath(other, pathname)
  )
}

export function isNavLinkActive(
  model: NavModel,
  href: string,
  pathname: string
): boolean {
  return isHrefActiveAmong(navModelHrefs(model), href, pathname)
}
