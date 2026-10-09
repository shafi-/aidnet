import { describe, expect, it } from 'vitest'
import { DonationReportRepository } from './DonationReportRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import type { DonationReport, PublicDonationReport } from '@/types'

const aReport = (over: Partial<DonationReport> = {}): DonationReport => ({
  id: 'report-1',
  amount: 500,
  currency: 'BDT',
  method: 'bkash',
  reference: 'TRX123',
  donor_name: 'Rahim',
  message: null,
  status: 'pending',
  created_at: '2026-10-06T00:00:00Z',
  ...over,
})

describe('DonationReportRepository', () => {
  it('propose sends campaign, amount and optional fields', async () => {
    const proposed = { id: 'report-1', status: 'pending', created_at: 'x' }
    const gw = createMockRpcGateway({
      propose_donation: { data: proposed },
    })
    const res = await new DonationReportRepository(gw).propose({
      campaignId: 'camp-1',
      amount: 500,
      method: 'bkash',
      reference: 'TRX123',
      donorName: 'Rahim',
      turnstileToken: 'tok',
    })

    expect(res.data).toEqual(proposed)
    expect(gw.callsTo('propose_donation')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_amount: 500,
      p_method: 'bkash',
      p_reference: 'TRX123',
      p_donor_name: 'Rahim',
      p_message: null,
      p_turnstile_token: 'tok',
    })
  })

  it('listByStatus scopes by campaign and status', async () => {
    const reports = [aReport()]
    const gw = createMockRpcGateway({
      list_donation_reports: { data: reports },
    })
    const res = await new DonationReportRepository(gw).listByStatus(
      'camp-1',
      'pending'
    )

    expect(res.data).toEqual(reports)
    expect(gw.callsTo('list_donation_reports')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_status: 'pending',
    })
  })

  it('listPublic defaults to 10 entries', async () => {
    const reports: PublicDonationReport[] = [
      {
        id: 'r1',
        amount: 500,
        currency: 'BDT',
        method: 'bkash',
        donor_name: 'Rahim',
        created_at: '2026-10-06T00:00:00Z',
      },
    ]
    const gw = createMockRpcGateway({
      get_public_donation_reports: { data: reports },
    })
    const res = await new DonationReportRepository(gw).listPublic('camp-1')

    expect(res.data).toEqual(reports)
    expect(gw.callsTo('get_public_donation_reports')[0].params).toEqual({
      p_campaign_id: 'camp-1',
      p_limit: 10,
    })
  })

  it('confirm and reject pass the report id', async () => {
    const gw = createMockRpcGateway({
      confirm_donation_report: { data: true },
      reject_donation_report: { data: true },
    })
    const repo = new DonationReportRepository(gw)

    expect((await repo.confirm('report-1')).data).toBe(true)
    expect(gw.callsTo('confirm_donation_report')[0].params).toEqual({
      p_report_id: 'report-1',
    })

    expect((await repo.reject('report-1', 'no reference')).data).toBe(true)
    expect(gw.callsTo('reject_donation_report')[0].params).toEqual({
      p_report_id: 'report-1',
      p_note: 'no reference',
    })
  })

  it('listForOrg calls list_org_donation_reports with org, status and limit', async () => {
    const rows = [
      {
        ...aReport(),
        campaign_id: 'camp-1',
        campaign_title: 'Demo Campaign 1',
      },
    ]
    const gw = createMockRpcGateway({
      list_org_donation_reports: { data: rows },
    })
    const res = await new DonationReportRepository(gw).listForOrg(
      'org-1',
      'confirmed',
      50
    )

    expect(res.data).toEqual(rows)
    expect(gw.callsTo('list_org_donation_reports')[0].params).toEqual({
      p_org_id: 'org-1',
      p_status: 'confirmed',
      p_limit: 50,
    })
  })

  it('listForOrg maps the all filter to an empty status so the RPC returns every status', async () => {
    const gw = createMockRpcGateway({
      list_org_donation_reports: { data: [] },
    })
    await new DonationReportRepository(gw).listForOrg('org-1', 'all')

    expect(gw.callsTo('list_org_donation_reports')[0].params).toEqual({
      p_org_id: 'org-1',
      p_status: '',
      p_limit: 100,
    })
  })
})
