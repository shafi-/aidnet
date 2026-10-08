import { describe, expect, it } from 'vitest'
import { OrganizationRepository } from './OrganizationRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { anOrganizationView, anOrgDetail } from '@/testing/fixtures'

describe('OrganizationRepository', () => {
  it('createOrganization maps args to create_organization params', async () => {
    const org = anOrganizationView()
    const gw = createMockRpcGateway({ create_organization: { data: org } })
    const res = await new OrganizationRepository(gw).createOrganization(
      'Demo Org',
      'demo-org',
      'desc',
      { key: 'value' }
    )

    expect(res.data).toEqual(org)
    expect(gw.callsTo('create_organization')[0].params).toEqual({
      org_name: 'Demo Org',
      org_slug: 'demo-org',
      org_description: 'desc',
      org_settings: { key: 'value' },
    })
  })

  it('getMyOrganizations calls get_my_organizations with pagination params', async () => {
    const orgs = [anOrganizationView()]
    const gw = createMockRpcGateway({
      get_my_organizations: { data: orgs },
    })
    const res = await new OrganizationRepository(gw).getMyOrganizations()

    expect(res.data).toEqual(orgs)
    expect(gw.callsTo('get_my_organizations')[0].params).toEqual({
      p_limit: 20,
      p_cursor: undefined,
    })
  })

  it('getMyOrganizations passes custom pagination params', async () => {
    const orgs = [anOrganizationView()]
    const gw = createMockRpcGateway({
      get_my_organizations: { data: orgs },
    })
    const res = await new OrganizationRepository(gw).getMyOrganizations({
      limit: 5,
      cursor: 'next-cursor',
    })

    expect(res.data).toEqual(orgs)
    expect(gw.callsTo('get_my_organizations')[0].params).toEqual({
      p_limit: 5,
      p_cursor: 'next-cursor',
    })
  })

  it('getOrganization scopes by target_org_id and returns raw table rows', async () => {
    const rows = [anOrgDetail()]
    const gw = createMockRpcGateway({ get_organization: { data: rows } })
    const res = await new OrganizationRepository(gw).getOrganization('org-1')

    expect(res.data).toEqual(rows)
    expect(gw.callsTo('get_organization')[0].params).toEqual({
      target_org_id: 'org-1',
    })
  })

  it('updateOrganization maps slug updates', async () => {
    const gw = createMockRpcGateway({
      update_organization: { data: anOrganizationView() },
    })
    await new OrganizationRepository(gw).updateOrganization('org-1', {
      slug: 'new-slug',
    })

    expect(gw.callsTo('update_organization')[0].params).toEqual({
      target_org_id: 'org-1',
      new_slug: 'new-slug',
    })
  })

  it('setOrgStatus maps status updates', async () => {
    const gw = createMockRpcGateway({
      set_org_status: { data: true },
    })
    const res = await new OrganizationRepository(gw).setOrgStatus(
      'org-1',
      'suspended'
    )

    expect(res.data).toBe(true)
    expect(gw.callsTo('set_org_status')[0].params).toEqual({
      p_org_id: 'org-1',
      p_status: 'suspended',
    })
  })

  it('deleteOrganization passes target_org_id', async () => {
    const gw = createMockRpcGateway({ delete_organization: { data: true } })
    const res = await new OrganizationRepository(gw).deleteOrganization('org-1')

    expect(res.data).toBe(true)
    expect(gw.callsTo('delete_organization')[0].params).toEqual({
      target_org_id: 'org-1',
    })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      get_my_organizations: { error: 'jwt expired' },
    })
    const res = await new OrganizationRepository(gw).getMyOrganizations({
      limit: 20,
    })

    expect(res).toEqual({ data: null, error: 'jwt expired' })
  })

  it('ensurePersonalOrg calls ensure_my_personal_org with no params and returns the org id', async () => {
    const personalOrgId = '44444444-4444-4444-4444-444444444444'
    const gw = createMockRpcGateway({
      ensure_my_personal_org: { data: personalOrgId },
    })
    const res = await new OrganizationRepository(gw).ensurePersonalOrg()

    expect(res.data).toBe(personalOrgId)
    expect(gw.callsTo('ensure_my_personal_org')).toHaveLength(1)
    expect(gw.callsTo('ensure_my_personal_org')[0].params).toBeUndefined()
  })
})
