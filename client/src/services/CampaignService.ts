import type {
  Campaign,
  CampaignTag,
  CreateCampaignDto,
  ServiceData,
  UpdateCampaignDto,
} from '@/types'
import { CampaignRepository } from '@/repositories/CampaignRepository'

export class CampaignService {
  constructor(
    private campaignRepo: CampaignRepository = new CampaignRepository()
  ) {}

  async createCampaign(dto: CreateCampaignDto): ServiceData<Campaign> {
    return this.campaignRepo.createCampaign(dto)
  }

  async getCampaigns(orgId: string): ServiceData<Campaign[]> {
    return this.campaignRepo.getCampaigns(orgId)
  }

  async getCampaign(campaignId: string): ServiceData<Campaign> {
    const { data, error } = await this.campaignRepo.getCampaign(campaignId)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async getCampaignBySlug(slug: string): ServiceData<Campaign> {
    const { data, error } = await this.campaignRepo.getCampaignBySlug(slug)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async updateCampaign(
    campaignId: string,
    dto: UpdateCampaignDto
  ): ServiceData<Campaign> {
    return this.campaignRepo.updateCampaign(campaignId, dto)
  }

  async deleteCampaign(campaignId: string): ServiceData<boolean> {
    return this.campaignRepo.deleteCampaign(campaignId)
  }

  async submitForReview(campaignId: string): ServiceData<Campaign> {
    return this.campaignRepo.submitForReview(campaignId)
  }

  async getCampaignTags(): ServiceData<CampaignTag[]> {
    return this.campaignRepo.getCampaignTags()
  }

  async setCampaignTags(
    campaignId: string,
    tagIds: string[]
  ): ServiceData<boolean> {
    return this.campaignRepo.setCampaignTags(campaignId, tagIds)
  }
}

export const campaignService = new CampaignService()
