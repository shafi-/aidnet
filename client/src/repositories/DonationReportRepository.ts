import { BaseRepository } from './BaseRepository'
import type {
  ServiceData,
  DonationReport,
  OrgDonationReport,
  PublicDonationReport,
} from '@/types'
import { Rpc } from '@/types/rpc'

export class DonationReportRepository extends BaseRepository {
  /** Anonymous donor report of an out-of-band transfer. */
  async propose(input: {
    campaignId: string
    amount: number
    method: string
    reference?: string
    donorName?: string
    message?: string
    turnstileToken?: string
  }): Promise<
    ServiceData<Pick<DonationReport, 'id' | 'status' | 'created_at'>>
  > {
    return this.callRpc(Rpc.DonationReport.Propose, {
      p_campaign_id: input.campaignId,
      p_amount: input.amount,
      p_method: input.method,
      p_reference: input.reference ?? null,
      p_donor_name: input.donorName ?? null,
      p_message: input.message ?? null,
      p_turnstile_token: input.turnstileToken ?? null,
    })
  }

  async listByStatus(
    campaignId: string,
    status: 'pending' | 'confirmed' | 'rejected'
  ): Promise<ServiceData<DonationReport[]>> {
    return this.callRpc<DonationReport[]>(Rpc.DonationReport.List, {
      p_campaign_id: campaignId,
      p_status: status,
    })
  }

  /** Cross-campaign review queue/history for the org workspace. */
  async listForOrg(
    orgId: string,
    status: 'pending' | 'confirmed' | 'rejected' | 'all' = 'pending',
    limit = 100
  ): Promise<ServiceData<OrgDonationReport[]>> {
    return this.callRpc<OrgDonationReport[]>(Rpc.DonationReport.ListForOrg, {
      p_org_id: orgId,
      p_status: status === 'all' ? '' : status,
      p_limit: limit,
    })
  }

  async listPublic(
    campaignId: string,
    limit = 10
  ): Promise<ServiceData<PublicDonationReport[]>> {
    return this.callRpc<PublicDonationReport[]>(
      Rpc.DonationReport.PublicForCampaign,
      { p_campaign_id: campaignId, p_limit: limit }
    )
  }

  async confirm(reportId: string): Promise<ServiceData<boolean>> {
    return this.callRpc<boolean>(Rpc.DonationReport.Confirm, {
      p_report_id: reportId,
    })
  }

  async reject(reportId: string, note?: string): Promise<ServiceData<boolean>> {
    return this.callRpc<boolean>(Rpc.DonationReport.Reject, {
      p_report_id: reportId,
      p_note: note ?? null,
    })
  }
}
