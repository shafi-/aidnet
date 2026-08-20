import { BaseRepository } from '@/repositories/BaseRepository'
import type { Campaign, ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export class AdminCampaignService extends BaseRepository {
  async getPendingCampaigns(): ServiceData<Campaign[]> {
    return this.callRpc<Campaign[]>(Rpc.AdminCampaign.GetPending)
  }

  async verifyCampaign(campaignId: string, notes?: string): ServiceData<Campaign> {
    return this.callRpc<Campaign>(Rpc.AdminCampaign.Verify, {
      p_campaign_id: campaignId,
      p_notes: notes ?? null,
    })
  }

  async rejectCampaign(campaignId: string, notes?: string): ServiceData<Campaign> {
    return this.callRpc<Campaign>(Rpc.AdminCampaign.Reject, {
      p_campaign_id: campaignId,
      p_notes: notes ?? null,
    })
  }
}

export const adminCampaignService = new AdminCampaignService()
