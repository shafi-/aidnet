import { describe, expect, it, vi } from 'vitest'
import { SystemAdminService } from './SystemAdminService'
import { SystemAdminRepository } from '@/repositories/SystemAdminRepository'
import { anOrgDetail, systemStats } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('SystemAdminService', () => {
  it('getAllOrgs delegates without params', async () => {
    const orgs = [anOrgDetail()]
    const getAllOrgs = vi.fn().mockResolvedValue(ok(orgs))
    const svc = new SystemAdminService(
      mockRepository<SystemAdminRepository>({ getAllOrgs })
    )

    const res = await svc.getAllOrgs()

    expect(getAllOrgs).toHaveBeenCalledTimes(1)
    expect(res).toEqual(ok(orgs))
  })

  it('getSystemStats delegates without params', async () => {
    const stats = systemStats()
    const getSystemStats = vi.fn().mockResolvedValue(ok(stats))
    const svc = new SystemAdminService(
      mockRepository<SystemAdminRepository>({ getSystemStats })
    )

    const res = await svc.getSystemStats()

    expect(getSystemStats).toHaveBeenCalledTimes(1)
    expect(res).toEqual(ok(stats))
  })

  it('isSystemAdmin delegates and propagates false on failure', async () => {
    const isSystemAdmin = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    const svc = new SystemAdminService(
      mockRepository<SystemAdminRepository>({ isSystemAdmin })
    )

    expect(await svc.isSystemAdmin()).toBe(true)
    expect(await svc.isSystemAdmin()).toBe(false)
  })

  it('propagates list errors untouched', async () => {
    const getAllOrgs = vi
      .fn()
      .mockResolvedValue({ data: null, error: 'not system admin' })
    const svc = new SystemAdminService(
      mockRepository<SystemAdminRepository>({ getAllOrgs })
    )

    expect(await svc.getAllOrgs()).toEqual({
      data: null,
      error: 'not system admin',
    })
  })
})
