import { describe, expect, it } from 'vitest'
import { SystemAdminCampaignRepository } from './SystemAdminCampaignRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aCampaign } from '@/testing/fixtures'

describe('SystemAdminCampaignRepository', () => {
  it('getPendingCampaigns calls get_pending_campaigns without params', async () => {
    const pending = [aCampaign({ status: 'pending_review' })]
    const gw = createMockRpcGateway({
      get_pending_campaigns: { data: pending },
    })
    const res = await new SystemAdminCampaignRepository(
      gw
    ).getPendingCampaigns()

    expect(res.data).toEqual(pending)
    expect(gw.callsTo('get_pending_campaigns')).toEqual([
      { functionName: 'get_pending_campaigns', params: undefined },
    ])
  })

  it('verifyCampaign maps id and coerces notes to null', async () => {
    const verified = aCampaign({ status: 'live', verified_by: 'admin-1' })
    const gw = createMockRpcGateway({ verify_campaign: { data: verified } })
    const res = await new SystemAdminCampaignRepository(gw).verifyCampaign(
      'camp-1'
    )

    expect(res.data).toEqual(verified)
    expect(gw.callsTo('verify_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_notes: null,
    })
  })

  it('verifyCampaign passes notes when provided', async () => {
    const gw = createMockRpcGateway({ verify_campaign: { data: aCampaign() } })
    await new SystemAdminCampaignRepository(gw).verifyCampaign(
      'camp-1',
      'docs ok'
    )

    expect(gw.callsTo('verify_campaign')[0].params).toMatchObject({
      p_notes: 'docs ok',
    })
  })

  it('rejectCampaign maps id and notes', async () => {
    const rejected = aCampaign({ status: 'rejected' })
    const gw = createMockRpcGateway({ reject_campaign: { data: rejected } })
    const res = await new SystemAdminCampaignRepository(gw).rejectCampaign(
      'camp-1',
      'invalid docs'
    )

    expect(res.data?.status).toBe('rejected')
    expect(gw.callsTo('reject_campaign')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_notes: 'invalid docs',
    })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      verify_campaign: { error: 'not system admin' },
    })
    const res = await new SystemAdminCampaignRepository(gw).verifyCampaign(
      'camp-1'
    )

    expect(res).toEqual({ data: null, error: 'not system admin' })
  })
})
