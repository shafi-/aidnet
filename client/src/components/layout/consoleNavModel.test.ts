import { describe, expect, it } from 'vitest'
import {
  ADMIN_SECTIONS,
  buildConsoleSections,
  buildWorkspaceSections,
  isConsoleSectionActive,
} from './consoleNavModel'

const adminFlags = {
  isOrgAdmin: true,
  isOrgOwner: true,
  hasFeature: () => true,
}

describe('buildWorkspaceSections', () => {
  it('shows overview and campaigns to every org member', () => {
    const sections = buildWorkspaceSections({
      isOrgAdmin: false,
      isOrgOwner: false,
      hasFeature: () => false,
    })

    expect(sections.map(s => s.href)).toEqual([
      '/dashboard',
      '/dashboard/campaigns',
    ])
  })

  it('adds donations for org admins', () => {
    const sections = buildWorkspaceSections({
      isOrgAdmin: true,
      isOrgOwner: false,
      hasFeature: () => false,
    })

    expect(sections.map(s => s.href)).toContain('/dashboard/donations')
    expect(sections.map(s => s.href)).not.toContain('/dashboard/billing')
  })

  it('adds billing only for the org owner', () => {
    const sections = buildWorkspaceSections({
      isOrgAdmin: false,
      isOrgOwner: true,
      hasFeature: () => false,
    })

    expect(sections.map(s => s.href)).toContain('/dashboard/billing')
    expect(sections.map(s => s.href)).not.toContain('/dashboard/donations')
  })

  it('gates members and settings behind plan features', () => {
    const withoutFeatures = buildWorkspaceSections({
      ...adminFlags,
      hasFeature: () => false,
    })
    expect(withoutFeatures.map(s => s.href)).not.toContain('/dashboard/members')
    expect(withoutFeatures.map(s => s.href)).not.toContain(
      '/dashboard/settings'
    )

    const withFeatures = buildWorkspaceSections({
      ...adminFlags,
      hasFeature: f => f === 'members' || f === 'settings',
    })
    expect(withFeatures.map(s => s.href)).toEqual([
      '/dashboard',
      '/dashboard/campaigns',
      '/dashboard/donations',
      '/dashboard/members',
      '/dashboard/billing',
      '/dashboard/settings',
    ])
  })
})

describe('buildConsoleSections', () => {
  it('returns the six admin destinations for the admin variant', () => {
    expect(buildConsoleSections('admin')).toEqual(ADMIN_SECTIONS)
    expect(ADMIN_SECTIONS.map(s => s.href)).toEqual([
      '/admin',
      '/admin/campaigns',
      '/admin/org-requests',
      '/admin/orgs',
      '/admin/plans',
      '/admin/subscriptions',
    ])
  })

  it('falls back to the locked-down workspace set without flags', () => {
    expect(buildConsoleSections('workspace').map(s => s.href)).toEqual([
      '/dashboard',
      '/dashboard/campaigns',
    ])
  })
})

describe('isConsoleSectionActive', () => {
  const sections = buildConsoleSections('workspace', adminFlags)

  it('activates the exact section', () => {
    expect(isConsoleSectionActive(sections, '/dashboard', '/dashboard')).toBe(
      true
    )
  })

  it('keeps Overview dark on a sub-route — longest match wins', () => {
    expect(
      isConsoleSectionActive(sections, '/dashboard', '/dashboard/campaigns')
    ).toBe(false)
    expect(
      isConsoleSectionActive(
        sections,
        '/dashboard/campaigns',
        '/dashboard/campaigns'
      )
    ).toBe(true)
  })

  it('matches nested pathnames below the section', () => {
    expect(
      isConsoleSectionActive(sections, '/dashboard', '/dashboard/members/')
    ).toBe(false)
    expect(
      isConsoleSectionActive(
        sections,
        '/dashboard/members',
        '/dashboard/members/'
      )
    ).toBe(true)
  })
})
