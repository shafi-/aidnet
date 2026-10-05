import { describe, expect, it, vi } from 'vitest'
import { SystemAdminCampaignService } from './SystemAdminCampaignService'
import { SystemAdminCampaignRepository } from '@/repositories/SystemAdminCampaignRepository'
import { aCampaign } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('SystemAdminCampaignService', () => {
  it('getPendingCampaigns delegates without params', async () => {
    const pending = [aCampaign({ status: 'pending_review' })]
    const getPendingCampaigns = vi.fn().mockResolvedValue(ok(pending))
    const svc = new SystemAdminCampaignService(
      mockRepository<SystemAdminCampaignRepository>({ getPendingCampaigns })
    )

    const res = await svc.getPendingCampaigns()

    expect(getPendingCampaigns).toHaveBeenCalledTimes(1)
    expect(res).toEqual(ok(pending))
  })

  it('verify and reject delegate id + notes', async () => {
    const verifyCampaign = vi
      .fn()
      .mockResolvedValue(ok(aCampaign({ status: 'live' })))
    const rejectCampaign = vi
      .fn()
      .mockResolvedValue(ok(aCampaign({ status: 'rejected' })))
    const svc = new SystemAdminCampaignService(
      mockRepository<SystemAdminCampaignRepository>({
        verifyCampaign,
        rejectCampaign,
      })
    )

    await svc.verifyCampaign('camp-1')
    const rejected = await svc.rejectCampaign('camp-1', 'bad docs')

    expect(verifyCampaign).toHaveBeenCalledWith('camp-1', undefined)
    expect(rejectCampaign).toHaveBeenCalledWith('camp-1', 'bad docs')
    expect(rejected.data?.status).toBe('rejected')
  })

  it('propagates errors untouched', async () => {
    const verifyCampaign = vi
      .fn()
      .mockResolvedValue({ data: null, error: 'forbidden' })
    const svc = new SystemAdminCampaignService(
      mockRepository<SystemAdminCampaignRepository>({ verifyCampaign })
    )

    expect(await svc.verifyCampaign('camp-1')).toEqual({
      data: null,
      error: 'forbidden',
    })
  })
})
