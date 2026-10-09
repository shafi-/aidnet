import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { useOrgOverview } from './useOrgOverview'
import { anOrgOverview } from '@/testing/fixtures'

const mockGetOverview = vi.hoisted(() => vi.fn())

vi.mock('@/services/OrganizationService', () => ({
  organizationService: {
    getOverview: mockGetOverview,
  },
}))

function setup(orgId: string | null) {
  return renderHook(({ id }) => useOrgOverview(id), {
    initialProps: { id: orgId },
  })
}

describe('useOrgOverview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetOverview.mockResolvedValue({ data: anOrgOverview(), error: null })
  })

  it('When mounted with an org id, loads the overview exactly once', async () => {
    const { result, rerender } = setup('org-1')

    await waitFor(() => expect(result.current.loading).toBe(false))
    rerender({ id: 'org-1' })
    rerender({ id: 'org-1' })

    expect(mockGetOverview).toHaveBeenCalledTimes(1)
    expect(mockGetOverview).toHaveBeenCalledWith('org-1')
    expect(result.current.overview).toEqual(anOrgOverview())
    expect(result.current.error).toBeNull()
  })

  it('When the org id changes, reloads for the new org', async () => {
    const { result, rerender } = setup('org-1')
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetOverview.mockResolvedValue({
      data: anOrgOverview({ raised_total: 999 }),
      error: null,
    })
    rerender({ id: 'org-2' })

    await waitFor(() =>
      expect(result.current.overview).toEqual(
        anOrgOverview({ raised_total: 999 })
      )
    )
    expect(mockGetOverview).toHaveBeenLastCalledWith('org-2')
  })

  it('When the RPC fails, the error is surfaced for retry', async () => {
    mockGetOverview.mockResolvedValue({ data: null, error: 'denied' })
    const { result } = setup('org-1')

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.overview).toBeNull()
    expect(result.current.error).toBe('denied')
  })

  it('When there is no org context, nothing loads', async () => {
    const { result } = setup(null)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockGetOverview).not.toHaveBeenCalled()
    expect(result.current.overview).toBeNull()
  })
})
