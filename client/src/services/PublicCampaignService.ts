import type {
  PublicCampaign,
  PublicCampaignFilters,
  ServiceData,
} from '@/types'
import { PublicCampaignRepository } from '@/repositories/PublicCampaignRepository'

export class PublicCampaignService {
  constructor(
    private publicCampaignRepo: PublicCampaignRepository = new PublicCampaignRepository()
  ) {}

  async getPublicCampaigns(
    filters: PublicCampaignFilters = {}
  ): ServiceData<PublicCampaign[]> {
    return this.publicCampaignRepo.getPublicCampaigns(filters)
  }
}

export const publicCampaignService = new PublicCampaignService()
