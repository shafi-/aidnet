import { describe, expect, it } from 'vitest'
import { PublicOrgRepository } from './PublicOrgRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aPublicOrg } from '@/testing/fixtures'

describe('PublicOrgRepository', () => {
  it('getPublicOrg passes org_slug and returns raw rows', async () => {
    const rows = [aPublicOrg()]
    const gw = createMockRpcGateway({ get_public_org_by_slug: { data: rows } })
    const res = await new PublicOrgRepository(gw).getPublicOrg('demo-org')

    expect(res.data).toEqual(rows)
    expect(gw.callsTo('get_public_org_by_slug')).toEqual([
      {
        functionName: 'get_public_org_by_slug',
        params: { org_slug: 'demo-org' },
      },
    ])
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      get_public_org_by_slug: { error: 'not found' },
    })
    const res = await new PublicOrgRepository(gw).getPublicOrg('nope')

    expect(res).toEqual({ data: null, error: 'not found' })
  })
})
