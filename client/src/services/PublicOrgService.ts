import type { ServiceData } from '@/types'
import {
  PublicOrgRepository,
  type PublicOrg,
} from '@/repositories/PublicOrgRepository'

export type { PublicOrg }

export class PublicOrgService {
  constructor(
    private publicOrgRepo: PublicOrgRepository = new PublicOrgRepository()
  ) {}

  async getPublicOrg(slug: string): ServiceData<PublicOrg[]> {
    return this.publicOrgRepo.getPublicOrg(slug)
  }
}

export const publicOrgService = new PublicOrgService()
