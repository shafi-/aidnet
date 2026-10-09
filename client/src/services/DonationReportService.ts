import type {
  ServiceData,
  DonationReport,
  OrgDonationReport,
  PublicDonationReport,
} from '@/types'
import { DonationReportRepository } from '@/repositories/DonationReportRepository'

export class DonationReportService {
  constructor(
    private repo: DonationReportRepository = new DonationReportRepository()
  ) {}

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
    return this.repo.propose(input)
  }

  async listByStatus(
    campaignId: string,
    status: 'pending' | 'confirmed' | 'rejected'
  ): Promise<ServiceData<DonationReport[]>> {
    return this.repo.listByStatus(campaignId, status)
  }

  async listPublic(
    campaignId: string,
    limit = 10
  ): Promise<ServiceData<PublicDonationReport[]>> {
    return this.repo.listPublic(campaignId, limit)
  }

  async listForOrg(
    orgId: string,
    status: 'pending' | 'confirmed' | 'rejected' | 'all' = 'pending',
    limit = 100
  ): Promise<ServiceData<OrgDonationReport[]>> {
    return this.repo.listForOrg(orgId, status, limit)
  }

  async confirm(reportId: string): Promise<ServiceData<boolean>> {
    return this.repo.confirm(reportId)
  }

  async reject(reportId: string, note?: string): Promise<ServiceData<boolean>> {
    return this.repo.reject(reportId, note)
  }
}

export const donationReportService = new DonationReportService()
