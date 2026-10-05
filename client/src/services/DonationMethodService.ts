import type { DonationMethod, DonationMethodDto, ServiceData } from '@/types'
import { DonationMethodRepository } from '@/repositories/DonationMethodRepository'

export class DonationMethodService {
  constructor(
    private donationMethodRepo: DonationMethodRepository = new DonationMethodRepository()
  ) {}

  async getDonationMethods(orgId: string): ServiceData<DonationMethod[]> {
    return this.donationMethodRepo.getDonationMethods(orgId)
  }

  async upsertDonationMethods(
    orgId: string,
    dto: DonationMethodDto
  ): ServiceData<DonationMethod> {
    return this.donationMethodRepo.upsertDonationMethods(orgId, dto)
  }
}

export const donationMethodService = new DonationMethodService()
