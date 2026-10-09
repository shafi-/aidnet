// Pure nav structure (DESIGN.md §5.1): order and grouping follow each
// audience's primary job. Labels are i18n keys; the caller renders them
// through t(). No React, no hooks — fully unit-testable.

export interface NavLinkItem {
  href: string
  /** i18n key */
  label: string
}

export type NavMenuItem =
  | { kind: 'link'; href: string; label: string }
  | { kind: 'organizations-menu' }
  | { kind: 'system-menu' }

export interface NavOrganizationsMenu {
  /** Current org context row; null when the user has no organization. */
  contextOrgName: string | null
  items: NavLinkItem[]
}

export interface NavSystemMenu {
  items: NavLinkItem[]
}

export interface NavDrawerGroup {
  /** i18n key for the section label, or null for the unlabeled primary group */
  label: string | null
  /** System-administration group: gets the distinct accent treatment */
  system: boolean
  links: NavLinkItem[]
}

export interface NavModel {
  items: NavMenuItem[]
  organizationsMenu: NavOrganizationsMenu | null
  systemMenu: NavSystemMenu | null
  drawerGroups: NavDrawerGroup[]
}

export interface NavModelInput {
  user: { email: string } | null
  currentOrg: { name: string } | null
  isSystemAdmin: boolean
}

const SYSTEM_MENU_ITEMS: NavLinkItem[] = [
  { href: '/admin', label: 'nav.adminOverview' },
  { href: '/admin/campaigns', label: 'nav.reviewCampaigns' },
  { href: '/admin/org-requests', label: 'nav.reviewOrgs' },
]

export function buildNavModel(input: NavModelInput): NavModel {
  const { user, currentOrg, isSystemAdmin } = input
  const systemMenu: NavSystemMenu | null = isSystemAdmin
    ? { items: SYSTEM_MENU_ITEMS }
    : null

  // Anonymous visitors: discovery is their only job, so Campaigns is the
  // single primary link (DESIGN.md — Dashboard stays hidden and guarded).
  if (!user) {
    return {
      items: [{ kind: 'link', href: '/campaigns', label: 'nav.campaigns' }],
      organizationsMenu: null,
      systemMenu: null,
      drawerGroups: [
        {
          label: null,
          system: false,
          links: [{ href: '/campaigns', label: 'nav.campaigns' }],
        },
      ],
    }
  }

  const drawerGroups: NavDrawerGroup[] = []
  if (systemMenu) {
    drawerGroups.push({
      label: 'nav.systemAdmin',
      system: true,
      links: SYSTEM_MENU_ITEMS,
    })
  }

  // Members without an organization are still discovery-first users, but
  // they can start fundraising as individuals — /dashboard/campaigns/new
  // lazily provisions their personal org (create-as-individual CTA).
  if (!currentOrg) {
    return {
      items: [
        { kind: 'link', href: '/campaigns', label: 'nav.campaigns' },
        ...(systemMenu ? [{ kind: 'system-menu' } as const] : []),
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
      systemMenu,
      drawerGroups: [
        {
          label: null,
          system: false,
          links: [
            { href: '/campaigns', label: 'nav.campaigns' },
            { href: '/dashboard/campaigns/new', label: 'nav.startCampaign' },
            { href: '/orgs', label: 'nav.organizations' },
            { href: '/org/request', label: 'nav.requestOrg' },
            { href: '/dashboard', label: 'nav.dashboard' },
          ],
        },
        ...drawerGroups,
      ],
    }
  }

  // Operators (org members, org admins, system admins): the workspace leads
  // — Dashboard, then the org's own campaigns; public discovery is demoted
  // to a quiet trailing "Discover" link but stays one click away.
  return {
    items: [
      { kind: 'link', href: '/dashboard', label: 'nav.dashboard' },
      ...(systemMenu ? [{ kind: 'system-menu' } as const] : []),
      { kind: 'link', href: '/dashboard/campaigns', label: 'nav.orgCampaigns' },
      { kind: 'organizations-menu' },
      { kind: 'link', href: '/campaigns', label: 'nav.discover' },
    ],
    organizationsMenu: {
      contextOrgName: currentOrg.name,
      items: [{ href: '/orgs', label: 'nav.browseOrgs' }],
    },
    systemMenu,
    drawerGroups: [
      {
        label: null,
        system: false,
        links: [
          { href: '/dashboard', label: 'nav.dashboard' },
          { href: '/dashboard/campaigns', label: 'nav.orgCampaigns' },
          { href: '/orgs', label: 'nav.organizations' },
          { href: '/campaigns', label: 'nav.discover' },
        ],
      },
      ...drawerGroups,
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
  links.push(...(model.systemMenu?.items ?? []))
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
 * matches the same pathname, so it must not light up.
 */
export function isNavLinkActive(
  model: NavModel,
  href: string,
  pathname: string
): boolean {
  if (!matchesPath(href, pathname)) return false
  return !navModelHrefs(model).some(
    other =>
      other !== href &&
      other.startsWith(href) &&
      other.length > href.length &&
      matchesPath(other, pathname)
  )
}
