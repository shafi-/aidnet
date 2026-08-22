import { BaseRepository } from './BaseRepository'
import type { Campaign, ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export class SystemAdminCampaignRepository extends BaseRepository {
  async getPendingCampaigns(): ServiceData<Campaign[]> {
    return this.callRpc<Campaign[]>(Rpc.SystemAdminCampaign.GetPending)
  }

  async verifyCampaign(
    campaignId: string,
    notes?: string
  ): ServiceData<Campaign> {
    return this.callRpc<Campaign>(Rpc.SystemAdminCampaign.Verify, {
      p_campaign_id: campaignId,
      p_notes: notes ?? null,
    })
  }

  async rejectCampaign(
    campaignId: string,
    notes?: string
  ): ServiceData<Campaign> {
    return this.callRpc<Campaign>(Rpc.SystemAdminCampaign.Reject, {
      p_campaign_id: campaignId,
      p_notes: notes ?? null,
    })
  }
}
