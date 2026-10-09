import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { useOrgMembers } from './useOrgMembers'
import { aMemberView, aMembership } from '@/testing/fixtures'

const mockGetMembers = vi.hoisted(() => vi.fn())
const mockGetInvites = vi.hoisted(() => vi.fn())

vi.mock('@/services/MemberService', () => ({
  memberService: {
    getMembers: mockGetMembers,
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  },
}))

vi.mock('@/services/InviteService', () => ({
  inviteService: {
    getInvites: mockGetInvites,
    generateInvite: vi.fn(),
    revokeInvite: vi.fn(),
  },
}))

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({ membership: aMembership({ role: 'admin' }) }),
}))

function setup(orgId: string) {
  return renderHook(({ id }) => useOrgMembers(id), {
    initialProps: { id: orgId },
  })
}

describe('useOrgMembers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetMembers.mockResolvedValue({ data: [aMemberView()], error: null })
    mockGetInvites.mockResolvedValue({ data: [], error: null })
  })

  it('When mounted with an org id, loads members and invites exactly once', async () => {
    const { result, rerender } = setup('org-1')

    await waitFor(() => expect(result.current.loading).toBe(false))
    // Extra renders (context churn, parent re-renders) must not refetch —
    // guards against the refetch loop that flooded the RPC with calls.
    rerender({ id: 'org-1' })
    rerender({ id: 'org-1' })

    expect(mockGetMembers).toHaveBeenCalledTimes(1)
    expect(mockGetMembers).toHaveBeenCalledWith('org-1')
    expect(mockGetInvites).toHaveBeenCalledTimes(1)
    expect(mockGetInvites).toHaveBeenCalledWith('org-1')
    expect(result.current.members).toEqual([aMemberView()])
    expect(result.current.error).toBeNull()
  })

  it('When the org id changes, reloads members for the new org', async () => {
    const { result, rerender } = setup('org-1')

    await waitFor(() => expect(result.current.loading).toBe(false))

    rerender({ id: 'org-2' })

    await waitFor(() => expect(mockGetMembers).toHaveBeenCalledWith('org-2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockGetMembers).toHaveBeenCalledTimes(2)
  })

  it('When the members RPC fails, surfaces the error and keeps the list empty', async () => {
    mockGetMembers.mockResolvedValue({ data: null, error: 'rpc down' })

    const { result } = setup('org-1')

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('rpc down')
    expect(result.current.members).toEqual([])
  })
})
