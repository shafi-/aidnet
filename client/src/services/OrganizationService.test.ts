import { describe, expect, it, vi } from 'vitest'
import { OrganizationService } from './OrganizationService'
import { OrganizationRepository } from '@/repositories/OrganizationRepository'
import { anOrganizationView, anOrgDetail } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('OrganizationService', () => {
  it('createOrganization delegates args', async () => {
    const org = anOrganizationView()
    const createOrganization = vi.fn().mockResolvedValue(ok(org))
    const svc = new OrganizationService(
      mockRepository<OrganizationRepository>({ createOrganization })
    )

    const res = await svc.createOrganization('Demo Org', 'demo-org', 'desc', {
      a: 1,
    })

    expect(createOrganization).toHaveBeenCalledWith(
      'Demo Org',
      'demo-org',
      'desc',
      { a: 1 }
    )
    expect(res).toEqual(ok(org))
  })

  it('getOrganization unwraps the single table row', async () => {
    const detail = anOrgDetail()
    const getOrganization = vi.fn().mockResolvedValue(ok([detail]))
    const svc = new OrganizationService(
      mockRepository<OrganizationRepository>({ getOrganization })
    )

    const res = await svc.getOrganization('org-1')

    expect(getOrganization).toHaveBeenCalledWith('org-1')
    expect(res).toEqual(ok(detail))
  })

  it('getOrganization returns null when rows are empty', async () => {
    const getOrganization = vi.fn().mockResolvedValue(ok([]))
    const svc = new OrganizationService(
      mockRepository<OrganizationRepository>({ getOrganization })
    )

    const res = await svc.getOrganization('missing')

    expect(res).toEqual({ data: null, error: null })
  })

  it('getOrganization propagates errors without unwrapping', async () => {
    const getOrganization = vi
      .fn()
      .mockResolvedValue({ data: null, error: 'denied' })
    const svc = new OrganizationService(
      mockRepository<OrganizationRepository>({ getOrganization })
    )

    const res = await svc.getOrganization('org-1')

    expect(res).toEqual({ data: null, error: 'denied' })
  })

  it('getOverview unwraps the single summary row', async () => {
    const overview = {
      pending_donation_reports: 2,
      confirmed_donations: 7,
      raised_total: 6500,
      live_campaigns: 3,
      pending_review_campaigns: 1,
      draft_campaigns: 0,
    }
    const getOverview = vi.fn().mockResolvedValue(ok([overview]))
    const svc = new OrganizationService(
      mockRepository<OrganizationRepository>({ getOverview })
    )

    const res = await svc.getOverview('org-1')

    expect(getOverview).toHaveBeenCalledWith('org-1')
    expect(res).toEqual(ok(overview))
  })

  it('getOverview returns null when rows are empty', async () => {
    const getOverview = vi.fn().mockResolvedValue(ok([]))
    const svc = new OrganizationService(
      mockRepository<OrganizationRepository>({ getOverview })
    )

    const res = await svc.getOverview('org-1')

    expect(res).toEqual({ data: null, error: null })
  })

  it('update and delete delegate ids', async () => {
    const updateOrganization = vi
      .fn()
      .mockResolvedValue(ok(anOrganizationView()))
    const deleteOrganization = vi.fn().mockResolvedValue(ok(true))
    const svc = new OrganizationService(
      mockRepository<OrganizationRepository>({
        updateOrganization,
        deleteOrganization,
      })
    )

    await svc.updateOrganization('org-1', { slug: 'new-slug' })
    const del = await svc.deleteOrganization('org-1')

    expect(updateOrganization).toHaveBeenCalledWith('org-1', {
      slug: 'new-slug',
    })
    expect(del).toEqual(ok(true))
  })

  it('ensurePersonalOrg delegates untouched and returns the org id', async () => {
    const personalOrgId = '44444444-4444-4444-4444-444444444444'
    const ensurePersonalOrg = vi.fn().mockResolvedValue(ok(personalOrgId))
    const svc = new OrganizationService(
      mockRepository<OrganizationRepository>({ ensurePersonalOrg })
    )

    const res = await svc.ensurePersonalOrg()

    expect(ensurePersonalOrg).toHaveBeenCalledWith()
    expect(res).toEqual(ok(personalOrgId))
  })
})
