import type { Campaign, ServiceData } from '@/types'
import { SystemAdminCampaignRepository } from '@/repositories/SystemAdminCampaignRepository'

export class SystemAdminCampaignService {
  constructor(
    private systemAdminCampaignRepo: SystemAdminCampaignRepository = new SystemAdminCampaignRepository()
  ) {}

  async getPendingCampaigns(): ServiceData<Campaign[]> {
    return this.systemAdminCampaignRepo.getPendingCampaigns()
  }

  async verifyCampaign(
    campaignId: string,
    notes?: string
  ): ServiceData<Campaign> {
    return this.systemAdminCampaignRepo.verifyCampaign(campaignId, notes)
  }

  async rejectCampaign(
    campaignId: string,
    notes?: string
  ): ServiceData<Campaign> {
    return this.systemAdminCampaignRepo.rejectCampaign(campaignId, notes)
  }
}

export const systemAdminCampaignService = new SystemAdminCampaignService()
