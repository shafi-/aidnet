import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { usePublicCampaigns } from './usePublicCampaigns'
import { aPublicCampaign } from '@/testing/fixtures'

const mockGetMany = vi.hoisted(() => vi.fn())

vi.mock('@/services/PublicCampaignService', () => ({
  publicCampaignService: {
    getPublicCampaigns: mockGetMany,
  },
}))

function setup(filters?: Parameters<typeof usePublicCampaigns>[0]) {
  return renderHook(() => usePublicCampaigns(filters))
}

describe('usePublicCampaigns', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetMany.mockResolvedValue({ data: [], error: null })
  })

  it('When the zakat filter is off, requests all campaigns without a zakat filter', async () => {
    setup({ zakat: false })

    await waitFor(() => expect(mockGetMany).toHaveBeenCalled())
    expect(mockGetMany).toHaveBeenCalledWith({
      zakat: null,
      org: null,
      limit: null,
    })
  })

  it('When the zakat filter is on, requests zakat-eligible campaigns only', async () => {
    setup({ zakat: true })

    await waitFor(() => expect(mockGetMany).toHaveBeenCalled())
    expect(mockGetMany).toHaveBeenCalledWith({
      zakat: true,
      org: null,
      limit: null,
    })
  })

  it('When no filters are given, requests all campaigns', async () => {
    setup()

    await waitFor(() => expect(mockGetMany).toHaveBeenCalled())
    expect(mockGetMany).toHaveBeenCalledWith({
      zakat: null,
      org: null,
      limit: null,
    })
  })

  it('When campaigns load, exposes the rows', async () => {
    const rows = [aPublicCampaign()]
    mockGetMany.mockResolvedValue({ data: rows, error: null })

    const { result } = setup({})

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.campaigns).toEqual(rows)
    expect(result.current.error).toBeNull()
  })

  it('When the RPC fails, surfaces the error and empties the list', async () => {
    mockGetMany.mockResolvedValue({ data: null, error: 'rpc down' })

    const { result } = setup({})

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('rpc down')
    expect(result.current.campaigns).toEqual([])
  })
})
