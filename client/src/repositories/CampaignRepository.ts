import { BaseRepository } from './BaseRepository'
import type {
  Campaign,
  CampaignTag,
  CreateCampaignDto,
  ServiceData,
  UpdateCampaignDto,
} from '@/types'
import { Rpc } from '@/types/rpc'

export class CampaignRepository extends BaseRepository {
  async createCampaign(dto: CreateCampaignDto): ServiceData<Campaign> {
    return this.callRpc<Campaign>(Rpc.Campaign.Create, {
      p_org_id: dto.orgId,
      p_title: dto.title,
      p_slug: dto.slug,
      p_description: dto.description ?? null,
      p_cover_image_url: dto.coverImageUrl ?? null,
      p_goal_amount: dto.goalAmount ?? null,
      p_currency: dto.currency ?? 'BDT',
      p_start_date: dto.startDate ?? null,
      p_end_date: dto.endDate ?? null,
      p_is_zakat_eligible: dto.isZakatEligible ?? false,
    })
  }

  async getCampaigns(orgId: string): ServiceData<Campaign[]> {
    return this.callRpc<Campaign[]>(Rpc.Campaign.GetMany, {
      p_org_id: orgId,
    })
  }

  async getCampaign(campaignId: string): ServiceData<Campaign[]> {
    return this.callRpc<Campaign[]>(Rpc.Campaign.Get, {
      p_campaign_id: campaignId,
    })
  }

  async getCampaignBySlug(slug: string): ServiceData<Campaign[]> {
    return this.callRpc<Campaign[]>(Rpc.Campaign.GetBySlug, {
      p_slug: slug,
    })
  }

  async updateCampaign(
    campaignId: string,
    dto: UpdateCampaignDto
  ): ServiceData<Campaign> {
    return this.callRpc<Campaign>(Rpc.Campaign.Update, {
      p_campaign_id: campaignId,
      p_title: dto.title,
      p_slug: dto.slug,
      p_description: dto.description ?? null,
      p_cover_image_url: dto.coverImageUrl ?? null,
      p_goal_amount: dto.goalAmount ?? null,
      p_currency: dto.currency,
      p_start_date: dto.startDate ?? null,
      p_end_date: dto.endDate ?? null,
      p_is_zakat_eligible: dto.isZakatEligible,
      p_status: dto.status,
    })
  }

  async deleteCampaign(campaignId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Campaign.Delete, {
      p_campaign_id: campaignId,
    })
  }

  async submitForReview(campaignId: string): ServiceData<Campaign> {
    return this.callRpc<Campaign>(Rpc.Campaign.Submit, {
      p_campaign_id: campaignId,
    })
  }

  async getCampaignTags(): ServiceData<CampaignTag[]> {
    return this.callRpc<CampaignTag[]>(Rpc.CampaignTag.GetMany)
  }

  async setCampaignTags(
    campaignId: string,
    tagIds: string[]
  ): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.CampaignTag.Set, {
      p_campaign_id: campaignId,
      p_tag_ids: tagIds,
    })
  }
}
