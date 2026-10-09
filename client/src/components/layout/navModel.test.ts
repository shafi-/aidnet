import { describe, expect, it } from 'vitest'

import { buildNavModel, isNavLinkActive } from './navModel'

const USER = { email: 'owner@donate.app' }
const ORG = { name: 'Hope Foundation' }

function hrefs(model: ReturnType<typeof buildNavModel>): string[] {
  return model.items.map(item => (item.kind === 'link' ? item.href : item.kind))
}

describe('buildNavModel', () => {
  it('When anonymous, shows only public discovery and no menus', () => {
    const model = buildNavModel({
      user: null,
      currentOrg: null,
      isSystemAdmin: false,
    })

    expect(hrefs(model)).toEqual(['/campaigns'])
    expect(model.organizationsMenu).toBeNull()
    expect(model.systemMenu).toBeNull()
    expect(model.drawerGroups).toEqual([
      {
        label: null,
        system: false,
        links: [{ href: '/campaigns', label: 'nav.campaigns' }],
      },
    ])
  })

  it('When member without org, discovery leads, org request is reachable, and individual fundraising is one click', () => {
    const model = buildNavModel({
      user: USER,
      currentOrg: null,
      isSystemAdmin: false,
    })

    expect(hrefs(model)).toEqual([
      '/campaigns',
      '/dashboard/campaigns/new',
      'organizations-menu',
      '/dashboard',
    ])
    expect(model.systemMenu).toBeNull()
    expect(model.organizationsMenu).toEqual({
      contextOrgName: null,
      items: [
        { href: '/orgs', label: 'nav.browseOrgs' },
        { href: '/org/request', label: 'nav.requestOrg' },
      ],
    })
    expect(model.drawerGroups[0].links.map(l => l.href)).toEqual([
      '/campaigns',
      '/dashboard/campaigns/new',
      '/orgs',
      '/org/request',
      '/dashboard',
    ])
  })

  it('When org member, workspace leads and discovery is demoted last', () => {
    const model = buildNavModel({
      user: USER,
      currentOrg: ORG,
      isSystemAdmin: false,
    })

    expect(hrefs(model)).toEqual([
      '/dashboard',
      '/dashboard/campaigns',
      'organizations-menu',
      '/campaigns',
    ])
    expect(model.organizationsMenu).toEqual({
      contextOrgName: 'Hope Foundation',
      items: [{ href: '/orgs', label: 'nav.browseOrgs' }],
    })
    // The org's own campaigns is a plain top-level link: one click, no menu.
    expect(model.items[1]).toEqual({
      kind: 'link',
      href: '/dashboard/campaigns',
      label: 'nav.orgCampaigns',
    })
    expect(model.drawerGroups[0].links.map(l => l.href)).toEqual([
      '/dashboard',
      '/dashboard/campaigns',
      '/orgs',
      '/campaigns',
    ])
  })

  it('When system admin, system menu sits right after Dashboard', () => {
    const model = buildNavModel({
      user: USER,
      currentOrg: ORG,
      isSystemAdmin: true,
    })

    expect(hrefs(model)).toEqual([
      '/dashboard',
      'system-menu',
      '/dashboard/campaigns',
      'organizations-menu',
      '/campaigns',
    ])
    expect(model.systemMenu?.items).toEqual([
      { href: '/admin', label: 'nav.adminOverview' },
      { href: '/admin/campaigns', label: 'nav.reviewCampaigns' },
      { href: '/admin/org-requests', label: 'nav.reviewOrgs' },
    ])
    // Drawer gets a dedicated labeled system section after the primary group.
    expect(model.drawerGroups[0].label).toBeNull()
    expect(model.drawerGroups[1]).toEqual({
      label: 'nav.systemAdmin',
      system: true,
      links: model.systemMenu!.items,
    })
  })

  it('When system admin without org, system menu still follows the first link', () => {
    const model = buildNavModel({
      user: USER,
      currentOrg: null,
      isSystemAdmin: true,
    })

    expect(hrefs(model)).toEqual([
      '/campaigns',
      'system-menu',
      '/dashboard/campaigns/new',
      'organizations-menu',
      '/dashboard',
    ])
    expect(model.drawerGroups[1].system).toBe(true)
  })
})

describe('isNavLinkActive', () => {
  const operator = buildNavModel({
    user: USER,
    currentOrg: ORG,
    isSystemAdmin: true,
  })

  it('When the pathname equals the href, the link is active', () => {
    expect(isNavLinkActive(operator, '/dashboard', '/dashboard')).toBe(true)
  })

  it('When the pathname is a child of the href, the link is active', () => {
    expect(
      isNavLinkActive(operator, '/dashboard', '/dashboard/campaigns/new/')
    ).toBe(false)
    expect(
      isNavLinkActive(
        operator,
        '/dashboard/campaigns',
        '/dashboard/campaigns/new/'
      )
    ).toBe(true)
  })

  it('When a strictly longer link matches the same pathname, only the longest is active', () => {
    expect(
      isNavLinkActive(operator, '/dashboard', '/dashboard/campaigns/')
    ).toBe(false)
    expect(
      isNavLinkActive(operator, '/dashboard/campaigns', '/dashboard/campaigns/')
    ).toBe(true)
  })

  it('When the pathname matches admin children, admin overview yields to the specific section', () => {
    expect(isNavLinkActive(operator, '/admin', '/admin/campaigns/')).toBe(false)
    expect(
      isNavLinkActive(operator, '/admin/campaigns', '/admin/campaigns/')
    ).toBe(true)
  })

  it('When the pathname is unrelated, nothing is active', () => {
    expect(isNavLinkActive(operator, '/dashboard', '/profile/')).toBe(false)
    expect(isNavLinkActive(operator, '/campaigns', '/profile/')).toBe(false)
  })

  it('When anonymous, Campaigns is active on the directory and its detail pages', () => {
    const anon = buildNavModel({
      user: null,
      currentOrg: null,
      isSystemAdmin: false,
    })

    expect(isNavLinkActive(anon, '/campaigns', '/campaigns/')).toBe(true)
    expect(isNavLinkActive(anon, '/campaigns', '/campaigns/detail/')).toBe(true)
  })
})
