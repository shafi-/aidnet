import { describe, expect, it } from 'vitest'
import { resolveAccessLevel, ROUTE_ACCESS } from './routeAccess'

describe('routeAccess', () => {
  it('marks public content public', () => {
    expect(resolveAccessLevel('/')).toBe('public')
    expect(resolveAccessLevel('/about')).toBe('public')
    expect(resolveAccessLevel('/privacy')).toBe('public')
    expect(resolveAccessLevel('/campaigns')).toBe('public')
    expect(resolveAccessLevel('/campaigns/detail')).toBe('public')
    expect(resolveAccessLevel('/orgs/public')).toBe('public')
    expect(resolveAccessLevel('/invite')).toBe('public')
  })

  it('keeps auth flows public', () => {
    expect(resolveAccessLevel('/auth/login')).toBe('public')
    expect(resolveAccessLevel('/auth/register')).toBe('public')
    expect(resolveAccessLevel('/auth/reset-password')).toBe('public')
  })

  it('requires authentication for the org area', () => {
    expect(resolveAccessLevel('/orgs')).toBe('authenticated')
    expect(resolveAccessLevel('/profile')).toBe('authenticated')
    expect(resolveAccessLevel('/dashboard')).toBe('authenticated')
    expect(resolveAccessLevel('/dashboard/campaigns')).toBe('authenticated')
    expect(resolveAccessLevel('/dashboard/campaigns/new')).toBe('authenticated')
    expect(resolveAccessLevel('/dashboard/campaigns/edit')).toBe(
      'authenticated'
    )
  })

  it('requires system admin for /admin subtree', () => {
    for (const p of [
      '/admin',
      '/admin/orgs',
      '/admin/plans',
      '/admin/campaigns',
      '/admin/subscriptions',
    ]) {
      expect(resolveAccessLevel(p)).toBe('systemAdmin')
    }
  })

  it('fails closed: unknown routes default to authenticated', () => {
    expect(resolveAccessLevel('/nonexistent-page')).toBe('authenticated')
    expect(resolveAccessLevel('/orgs-public-lookalike')).toBe('authenticated')
  })

  it('every rule declares a known level', () => {
    const levels = ['public', 'authenticated', 'systemAdmin']
    for (const rule of ROUTE_ACCESS) {
      expect(levels).toContain(rule.level)
      expect(rule.exact !== undefined || rule.prefix !== undefined).toBe(true)
    }
  })

  it('does not let prefix rules swallow more specific later matches', () => {
    // /admin prefix is systemAdmin; /auth prefix is public — order independent here
    expect(resolveAccessLevel('/auth/login')).not.toBe('systemAdmin')
    expect(resolveAccessLevel('/admin')).toBe('systemAdmin')
  })
})
