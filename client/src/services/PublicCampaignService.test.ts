import { describe, expect, it, vi } from 'vitest'
import { PublicCampaignService } from './PublicCampaignService'
import { PublicCampaignRepository } from '@/repositories/PublicCampaignRepository'
import { aPublicCampaign } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('PublicCampaignService', () => {
  it('getPublicCampaigns delegates default filters', async () => {
    const getPublicCampaigns = vi
      .fn()
      .mockResolvedValue(ok([aPublicCampaign()]))
    const svc = new PublicCampaignService(
      mockRepository<PublicCampaignRepository>({ getPublicCampaigns })
    )

    const res = await svc.getPublicCampaigns()

    expect(getPublicCampaigns).toHaveBeenCalledWith({})
    expect(res.data).toHaveLength(1)
  })

  it('getPublicCampaigns forwards provided filters and propagates errors', async () => {
    const getPublicCampaigns = vi
      .fn()
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce({ data: null, error: 'db down' })
    const svc = new PublicCampaignService(
      mockRepository<PublicCampaignRepository>({ getPublicCampaigns })
    )

    const filtered = await svc.getPublicCampaigns({ zakat: true, limit: 5 })

    expect(getPublicCampaigns).toHaveBeenCalledWith({ zakat: true, limit: 5 })
    expect(filtered).toEqual(ok([]))
    expect(await svc.getPublicCampaigns()).toEqual({
      data: null,
      error: 'db down',
    })
  })
})
