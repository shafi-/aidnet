import { BaseRepository } from './BaseRepository'
import type {
  PublicCampaign,
  PublicCampaignFilters,
  ServiceData,
} from '@/types'
import { Rpc } from '@/types/rpc'

export class PublicCampaignRepository extends BaseRepository {
  async getPublicCampaigns(
    filters: PublicCampaignFilters = {}
  ): ServiceData<PublicCampaign[]> {
    return this.callRpc<PublicCampaign[]>(Rpc.PublicCampaign.GetMany, {
      zakat_filter: filters.zakat ?? null,
      org_filter: filters.org ?? null,
      result_limit: filters.limit ?? null,
    })
  }
}
