import { describe, expect, it } from 'vitest'

import { buildNavModel, isNavLinkActive } from './navModel'

const USER = { email: 'owner@donate.app' }
const ORG = { name: 'Hope Foundation' }

function hrefs(model: ReturnType<typeof buildNavModel>): string[] {
  return model.items.map(item => (item.kind === 'link' ? item.href : item.kind))
}

describe('buildNavModel', () => {
  it('When anonymous, shows public discovery links and no menus', () => {
    const model = buildNavModel({
      user: null,
      currentOrg: null,
      isSystemAdmin: false,
    })

    expect(hrefs(model)).toEqual(['/campaigns', '/orgs'])
    expect(model.organizationsMenu).toBeNull()
    expect(model.drawerGroups).toEqual([
      {
        label: null,
        links: [
          { href: '/campaigns', label: 'nav.campaigns' },
          { href: '/orgs', label: 'nav.organizations' },
        ],
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
      '/manage/orgs',
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
      '/manage/orgs',
      '/campaigns',
    ])
  })

  it('When system admin, Admin collapses to a single link after the first link', () => {
    const model = buildNavModel({
      user: USER,
      currentOrg: ORG,
      isSystemAdmin: true,
    })

    // The admin destinations themselves live in the console sidebar — the
    // public nav carries exactly one entry point.
    expect(hrefs(model)).toEqual([
      '/dashboard',
      '/admin',
      '/dashboard/campaigns',
      'organizations-menu',
      '/campaigns',
    ])
    expect(model.drawerGroups[0].links.map(l => l.href)).toEqual([
      '/dashboard',
      '/dashboard/campaigns',
      '/manage/orgs',
      '/campaigns',
      '/admin',
    ])
  })

  it('When system admin without org, the single Admin link still follows the first link', () => {
    const model = buildNavModel({
      user: USER,
      currentOrg: null,
      isSystemAdmin: true,
    })

    expect(hrefs(model)).toEqual([
      '/campaigns',
      '/admin',
      '/dashboard/campaigns/new',
      'organizations-menu',
      '/dashboard',
    ])
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

  it('When the pathname is admin itself, the single Admin link is active', () => {
    expect(isNavLinkActive(operator, '/admin', '/admin/')).toBe(true)
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
