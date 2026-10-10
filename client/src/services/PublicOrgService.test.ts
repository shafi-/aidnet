import { describe, expect, it, vi } from 'vitest'
import { PublicOrgService } from './PublicOrgService'
import { PublicOrgRepository } from '@/repositories/PublicOrgRepository'
import { aPublicOrg } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('PublicOrgService', () => {
  it('getPublicOrg delegates slug and returns raw rows', async () => {
    const rows = [aPublicOrg()]
    const getPublicOrg = vi.fn().mockResolvedValue(ok(rows))
    const svc = new PublicOrgService(
      mockRepository<PublicOrgRepository>({ getPublicOrg })
    )

    const res = await svc.getPublicOrg('demo-org')

    expect(getPublicOrg).toHaveBeenCalledWith('demo-org')
    expect(res).toEqual(ok(rows))
  })

  it('propagates errors untouched', async () => {
    const getPublicOrg = vi
      .fn()
      .mockResolvedValue({ data: null, error: 'missing' })
    const svc = new PublicOrgService(
      mockRepository<PublicOrgRepository>({ getPublicOrg })
    )

    expect(await svc.getPublicOrg('nope')).toEqual({
      data: null,
      error: 'missing',
    })
  })

  it('getPublicOrgs delegates to the repository', async () => {
    const rows = [aPublicOrg()]
    const getPublicOrgs = vi.fn().mockResolvedValue(ok(rows))
    const svc = new PublicOrgService(
      mockRepository<PublicOrgRepository>({ getPublicOrgs })
    )

    const res = await svc.getPublicOrgs()

    expect(getPublicOrgs).toHaveBeenCalledWith()
    expect(res).toEqual(ok(rows))
  })
})
