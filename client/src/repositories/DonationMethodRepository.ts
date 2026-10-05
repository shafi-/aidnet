import { BaseRepository } from './BaseRepository'
import type { DonationMethod, DonationMethodDto, ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export class DonationMethodRepository extends BaseRepository {
  async getDonationMethods(orgId: string): ServiceData<DonationMethod[]> {
    return this.callRpc<DonationMethod[]>(Rpc.DonationMethod.GetMany, {
      p_org_id: orgId,
    })
  }

  async upsertDonationMethods(
    orgId: string,
    dto: DonationMethodDto
  ): ServiceData<DonationMethod> {
    return this.callRpc<DonationMethod>(Rpc.DonationMethod.Upsert, {
      p_org_id: orgId,
      p_bkash_number: dto.bkashNumber ?? null,
      p_bkash_account_name: dto.bkashAccountName ?? null,
      p_nagad_number: dto.nagadNumber ?? null,
      p_nagad_account_name: dto.nagadAccountName ?? null,
      p_rocket_number: dto.rocketNumber ?? null,
      p_rocket_account_name: dto.rocketAccountName ?? null,
      p_bank_name: dto.bankName ?? null,
      p_bank_account_number: dto.bankAccountNumber ?? null,
      p_bank_account_name: dto.bankAccountName ?? null,
      p_bank_routing_number: dto.bankRoutingNumber ?? null,
      p_bank_branch: dto.bankBranch ?? null,
      p_donation_url: dto.donationUrl ?? null,
      p_qr_image_url: dto.qrImageUrl ?? null,
      p_instructions: dto.instructions ?? null,
      p_is_preferred: dto.isPreferred ?? false,
    })
  }
}
