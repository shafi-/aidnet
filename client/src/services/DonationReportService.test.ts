import { describe, expect, it, vi } from 'vitest'
import { DonationReportService } from './DonationReportService'
import type { DonationReportRepository } from '@/repositories/DonationReportRepository'
import type { DonationReport, PublicDonationReport } from '@/types'

const aReport = (over: Partial<DonationReport> = {}): DonationReport => ({
  id: 'report-1',
  amount: 500,
  currency: 'BDT',
  method: 'bkash',
  reference: null,
  donor_name: null,
  message: null,
  status: 'pending',
  created_at: '2026-10-06T00:00:00Z',
  ...over,
})

function serviceWithRepo(overrides: Partial<DonationReportRepository>) {
  const repo = {
    propose: vi.fn(),
    listByStatus: vi.fn(),
    listPublic: vi.fn(),
    confirm: vi.fn(),
    reject: vi.fn(),
    ...overrides,
  } as unknown as DonationReportRepository
  return { service: new DonationReportService(repo), repo }
}

describe('DonationReportService', () => {
  it('propose delegates to the repository', async () => {
    const input = {
      campaignId: 'camp-1',
      amount: 500,
      method: 'bkash',
      turnstileToken: 'tok',
    }
    const { service, repo } = serviceWithRepo({
      propose: vi.fn().mockResolvedValue({ data: { id: 'r1' } }),
    })
    await service.propose(input)
    expect(repo.propose).toHaveBeenCalledWith(input)
  })

  it('listByStatus delegates campaign and status', async () => {
    const reports = [aReport()]
    const { service, repo } = serviceWithRepo({
      listByStatus: vi.fn().mockResolvedValue({ data: reports }),
    })
    const res = await service.listByStatus('camp-1', 'pending')
    expect(res.data).toEqual(reports)
    expect(repo.listByStatus).toHaveBeenCalledWith('camp-1', 'pending')
  })

  it('listPublic delegates with default limit', async () => {
    const reports: PublicDonationReport[] = []
    const { service, repo } = serviceWithRepo({
      listPublic: vi.fn().mockResolvedValue({ data: reports }),
    })
    await service.listPublic('camp-1')
    expect(repo.listPublic).toHaveBeenCalledWith('camp-1', 10)
  })

  it('confirm and reject delegate', async () => {
    const { service, repo } = serviceWithRepo({
      confirm: vi.fn().mockResolvedValue({ data: true }),
      reject: vi.fn().mockResolvedValue({ data: true }),
    })
    await service.confirm('r1')
    expect(repo.confirm).toHaveBeenCalledWith('r1')
    await service.reject('r1', 'duplicate')
    expect(repo.reject).toHaveBeenCalledWith('r1', 'duplicate')
  })

  it('listForOrg delegates org, status and limit untouched', async () => {
    const rows = [
      {
        ...aReport(),
        campaign_id: 'camp-1',
        campaign_title: 'Demo Campaign 1',
      },
    ]
    const { service, repo } = serviceWithRepo({
      listForOrg: vi.fn().mockResolvedValue({ data: rows, error: null }),
    })

    const res = await service.listForOrg('org-1', 'pending', 50)

    expect(repo.listForOrg).toHaveBeenCalledWith('org-1', 'pending', 50)
    expect(res).toEqual({ data: rows, error: null })
  })
})
