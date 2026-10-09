import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { useOrgDonationReports } from './useOrgDonationReports'
import { anOrgDonationReport } from '@/testing/fixtures'

const mockListForOrg = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn())
const mockReject = vi.hoisted(() => vi.fn())

vi.mock('@/services/DonationReportService', () => ({
  donationReportService: {
    listForOrg: mockListForOrg,
    confirm: mockConfirm,
    reject: mockReject,
  },
}))

function setup(orgId: string | null, status: 'pending' | 'confirmed' | 'all') {
  return renderHook(({ id, status }) => useOrgDonationReports(id, status), {
    initialProps: { id: orgId, status },
  })
}

describe('useOrgDonationReports', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockListForOrg.mockResolvedValue({
      data: [anOrgDonationReport()],
      error: null,
    })
    mockConfirm.mockResolvedValue({ data: true, error: null })
    mockReject.mockResolvedValue({ data: true, error: null })
  })

  it('When mounted with an org id, loads reports exactly once', async () => {
    const { result, rerender } = setup('org-1', 'pending')

    await waitFor(() => expect(result.current.loading).toBe(false))
    rerender({ id: 'org-1', status: 'pending' })

    expect(mockListForOrg).toHaveBeenCalledTimes(1)
    expect(mockListForOrg).toHaveBeenCalledWith('org-1', 'pending', 100)
    expect(result.current.reports).toEqual([anOrgDonationReport()])
  })

  it('When the status changes, reloads with the new status', async () => {
    const { result, rerender } = setup('org-1', 'pending')
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockListForOrg.mockResolvedValue({
      data: [anOrgDonationReport({ id: 'report-2', status: 'confirmed' })],
      error: null,
    })
    rerender({ id: 'org-1', status: 'confirmed' })

    await waitFor(() => expect(result.current.reports[0]?.id).toBe('report-2'))
    expect(mockListForOrg).toHaveBeenLastCalledWith('org-1', 'confirmed', 100)
  })

  it('When a report is confirmed, the ledger reloads', async () => {
    const { result } = setup('org-1', 'pending')
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.confirm('report-1')

    expect(mockConfirm).toHaveBeenCalledWith('report-1')
    expect(mockListForOrg).toHaveBeenCalledTimes(2)
  })

  it('When a report is rejected, the ledger reloads', async () => {
    const { result } = setup('org-1', 'pending')
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.reject('report-1')

    expect(mockReject).toHaveBeenCalledWith('report-1')
    expect(mockListForOrg).toHaveBeenCalledTimes(2)
  })

  it('When there is no org context, nothing loads', async () => {
    const { result } = setup(null, 'pending')

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockListForOrg).not.toHaveBeenCalled()
    expect(result.current.reports).toEqual([])
  })
})
