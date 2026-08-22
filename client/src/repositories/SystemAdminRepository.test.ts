import { describe, expect, it } from 'vitest'
import { SystemAdminRepository } from './SystemAdminRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { anOrgDetail, systemStats } from '@/testing/fixtures'

describe('SystemAdminRepository', () => {
  it('getAllOrgs calls get_all_organizations without params', async () => {
    const orgs = [anOrgDetail()]
    const gw = createMockRpcGateway({ get_all_organizations: { data: orgs } })
    const res = await new SystemAdminRepository(gw).getAllOrgs()

    expect(res.data).toEqual(orgs)
    expect(gw.callsTo('get_all_organizations')).toEqual([
      { functionName: 'get_all_organizations', params: undefined },
    ])
  })

  it('getSystemStats calls get_system_stats without params', async () => {
    const stats = systemStats()
    const gw = createMockRpcGateway({ get_system_stats: { data: stats } })
    const res = await new SystemAdminRepository(gw).getSystemStats()

    expect(res.data).toEqual(stats)
    expect(gw.callsTo('get_system_stats')).toEqual([
      { functionName: 'get_system_stats', params: undefined },
    ])
  })

  it('isSystemAdmin resolves true when RPC returns true', async () => {
    const gw = createMockRpcGateway({ is_system_admin: { data: true } })
    const res = await new SystemAdminRepository(gw).isSystemAdmin()

    expect(res).toBe(true)
    expect(gw.callsTo('is_system_admin')).toEqual([
      { functionName: 'is_system_admin', params: undefined },
    ])
  })

  it('isSystemAdmin resolves false on error (fail closed)', async () => {
    const gw = createMockRpcGateway({ is_system_admin: { error: 'denied' } })
    const res = await new SystemAdminRepository(gw).isSystemAdmin()

    expect(res).toBe(false)
  })

  it('isSystemAdmin resolves false when data is not exactly true', async () => {
    const gw = createMockRpcGateway({ is_system_admin: { data: false } })
    const res = await new SystemAdminRepository(gw).isSystemAdmin()

    expect(res).toBe(false)
  })
})
