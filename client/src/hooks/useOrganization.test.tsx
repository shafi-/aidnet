import { describe, expect, it, vi, beforeEach } from 'vitest'

import { act, renderHook, waitFor } from '@testing-library/react'
import { OrganizationProvider, useOrganization } from './useOrganization'

const {
  mockGetMyOrganizations,
  mockGetOrganization,
  mockGetMembership,
  mockUseAuth,
} = vi.hoisted(() => ({
  mockGetMyOrganizations: vi.fn(),
  mockGetOrganization: vi.fn(),
  mockGetMembership: vi.fn(),
  mockUseAuth: vi.fn(),
}))

// Mock the services with deterministic, controllable fakes
vi.mock('@/services/OrganizationService', () => ({
  organizationService: {
    getMyOrganizations: mockGetMyOrganizations,
    getOrganization: mockGetOrganization,
  },
}))
vi.mock('@/services/MemberService', () => ({
  memberService: {
    getMembership: mockGetMembership,
  },
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

describe('useOrganization with suspended organizations', () => {
  const mockOrganizations = [
    {
      id: 'org-1',
      name: 'Active Organization',
      slug: 'active-org',
      status: 'active' as const,
      description: 'An active organization',
      logo_url: null,
      member_count: 5,
      user_id: 'user-1',
      user_role: 'admin',
      membership_status: 'active',
      joined_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      website_url: null,
      contact_email: null,
      contact_phone: null,
      address: null,
      social_links: {},
      settings: {},
    },
    {
      id: 'org-2',
      name: 'Suspended Organization',
      slug: 'suspended-org',
      status: 'suspended' as const,
      description: 'A suspended organization',
      logo_url: null,
      member_count: 3,
      user_id: 'user-1',
      user_role: 'admin',
      membership_status: 'active',
      joined_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      website_url: null,
      contact_email: null,
      contact_phone: null,
      address: null,
      social_links: {},
      settings: {},
    },
    {
      id: 'org-3',
      name: 'Another Active Organization',
      slug: 'another-active-org',
      status: 'active' as const,
      description: 'Another active organization',
      logo_url: null,
      member_count: 2,
      user_id: 'user-1',
      user_role: 'member',
      membership_status: 'active',
      joined_at: '2024-01-01T00:00:00Z',
      created_by: 'user-2',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      website_url: null,
      contact_email: null,
      contact_phone: null,
      address: null,
      social_links: {},
      settings: {},
    },
  ]

  beforeEach(() => {
    mockGetMyOrganizations.mockReset()
    mockGetOrganization.mockReset()
    mockGetMembership.mockReset()
    mockUseAuth.mockReset()
    // Mock user to be authenticated
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      loading: false,
    })

    // Mock memberService.getMembership to return empty array by default
    mockGetMembership.mockResolvedValue({
      data: [],
      error: null,
    })
  })

  it('filters out suspended organizations from auto-selection', async () => {
    mockGetMyOrganizations.mockResolvedValue({
      data: mockOrganizations,
      error: null,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    await waitFor(() => {
      expect(result.current.selectionRequired).toBe(true)
    })

    // Should require selection since there are multiple active orgs
    expect(result.current.organizations).toHaveLength(3) // All orgs shown
  })

  it('auto-selects single active organization when one active org exists', async () => {
    const singleActiveOrg = [
      {
        id: 'org-1',
        name: 'Active Organization',
        slug: 'active-org',
        status: 'active' as const,
        description: 'An active organization',
        logo_url: null,
        member_count: 5,
        user_id: 'user-1',
        user_role: 'admin',
        membership_status: 'active',
        joined_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        website_url: null,
        contact_email: null,
        contact_phone: null,
        address: null,
        social_links: {},
        settings: {},
      },
    ]

    mockGetMyOrganizations.mockResolvedValue({
      data: singleActiveOrg,
      error: null,
    })
    mockGetOrganization.mockResolvedValue({
      data: singleActiveOrg,
      error: null,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    await waitFor(() => {
      expect(result.current.currentOrg).not.toBeNull()
    })

    // Should auto-select the single active org
    expect(result.current.selectionRequired).toBe(false)
  })

  it('does not auto-select suspended organizations', async () => {
    const onlySuspendedOrgs = [
      {
        id: 'org-2',
        name: 'Suspended Organization',
        slug: 'suspended-org',
        status: 'suspended' as const,
        description: 'A suspended organization',
        logo_url: null,
        member_count: 3,
        user_id: 'user-1',
        user_role: 'admin',
        membership_status: 'active',
        joined_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        website_url: null,
        contact_email: null,
        contact_phone: null,
        address: null,
        social_links: {},
        settings: {},
      },
    ]

    mockGetMyOrganizations.mockResolvedValue({
      data: onlySuspendedOrgs,
      error: null,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    await waitFor(() => {
      expect(result.current.selectionRequired).toBe(true)
    })

    // Should require selection even though there's only one org (it's suspended)
    expect(result.current.currentOrg).toBeNull()
  })

  it('clears current org when it becomes suspended', async () => {
    // Start with active org
    const activeOrg = {
      id: 'org-1',
      name: 'Active Organization',
      slug: 'active-org',
      status: 'active' as const,
      description: 'An active organization',
      logo_url: null,
      member_count: 5,
      user_id: 'user-1',
      user_role: 'admin',
      membership_status: 'active',
      joined_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      website_url: null,
      contact_email: null,
      contact_phone: null,
      address: null,
      social_links: {},
      settings: {},
    }

    mockGetMyOrganizations.mockResolvedValue({
      data: [activeOrg],
      error: null,
    })
    // Auto-select fetches the single active org's detail via getOrganization.
    mockGetOrganization.mockResolvedValue({
      data: activeOrg,
      error: null,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    await waitFor(() => {
      expect(result.current.currentOrg).toEqual(activeOrg)
    })

    // Now simulate org becoming suspended
    const suspendedOrg = { ...activeOrg, status: 'suspended' as const }
    mockGetMyOrganizations.mockResolvedValue({
      data: [suspendedOrg],
      error: null,
    })
    mockGetOrganization.mockResolvedValue({
      data: suspendedOrg,
      error: null,
    })

    // Trigger re-render by calling the hook again
    result.current.refreshOrg()

    await waitFor(() => {
      expect(result.current.currentOrg).toBeNull()
      expect(result.current.selectionRequired).toBe(true)
    })
  })
  it('keeps forced selection after a suspended ?id= attempt despite a single active org', async () => {
    // Regression: an unconditional effect used to clear selectionRequired on
    // every rerun, silently auto-selecting the remaining org and hiding the
    // suspension from the user.
    const personal = { ...mockOrganizations[0] }
    const suspended = {
      ...mockOrganizations[1],
      name: 'Attempted Org',
      slug: 'attempted-org',
      id: 'org-attempted',
    }

    mockGetMyOrganizations.mockResolvedValue({
      data: [personal, suspended],
      error: null,
    })
    // Service-layer contract: getOrganization resolves to a SINGLE detail
    // (the service performs the PostgREST array unwrap), not raw rows.
    mockGetOrganization.mockResolvedValue({
      data: suspended,
      error: null,
    })

    localStorage.setItem('supanext.currentOrgId', 'org-attempted')

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Explicit attempt to select the suspended org via URL param
    // selectOrgById is async (fetches org detail) — flush it inside act
    await act(async () => {
      await result.current.selectOrgById('org-attempted')
    })

    await waitFor(() => {
      expect(result.current.selectionRequired).toBe(true)
      expect(result.current.currentOrg?.id).not.toBe('org-attempted')
    })
  })
})
