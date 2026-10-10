import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { usePublicOrgs } from './usePublicOrgs'
import { aPublicOrg } from '@/testing/fixtures'

const mockGetOrgs = vi.hoisted(() => vi.fn())

vi.mock('@/services/PublicOrgService', () => ({
  publicOrgService: {
    getPublicOrgs: mockGetOrgs,
  },
}))

function setup() {
  return renderHook(() => usePublicOrgs())
}

describe('usePublicOrgs', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetOrgs.mockResolvedValue({ data: [], error: null })
  })

  it('When orgs load, exposes the rows', async () => {
    const rows = [aPublicOrg()]
    mockGetOrgs.mockResolvedValue({ data: rows, error: null })

    const { result } = setup()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.orgs).toEqual(rows)
    expect(result.current.error).toBeNull()
  })

  it('When the RPC fails, surfaces the error and empties the list', async () => {
    mockGetOrgs.mockResolvedValue({ data: null, error: 'rpc down' })

    const { result } = setup()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('rpc down')
    expect(result.current.orgs).toEqual([])
  })
})
