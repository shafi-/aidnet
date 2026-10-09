import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { usePermissions } from './usePermissions'
import { aMembership } from '@/testing/fixtures'
import type { Membership } from '@/types'

const mockMembership = vi.hoisted(() => ({
  current: null as Membership | null,
}))

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({ membership: mockMembership.current }),
}))

describe('usePermissions', () => {
  it('When the component re-renders, keeps permission predicates referentially stable', () => {
    mockMembership.current = aMembership({ role: 'admin' })
    const { result, rerender } = renderHook(() => usePermissions())
    const first = result.current

    rerender()

    expect(result.current.isOrgAdmin).toBe(first.isOrgAdmin)
    expect(result.current.isOrgOwner).toBe(first.isOrgOwner)
    expect(result.current.isOrgMember).toBe(first.isOrgMember)
    expect(result.current.hasPermission).toBe(first.hasPermission)
  })

  it('When the membership role changes, hands out a new isOrgAdmin', () => {
    mockMembership.current = aMembership({ role: 'admin' })
    const { result, rerender } = renderHook(() => usePermissions())
    const adminCheck = result.current.isOrgAdmin

    mockMembership.current = aMembership({ role: 'member' })
    rerender()

    expect(result.current.isOrgAdmin).not.toBe(adminCheck)
    expect(result.current.isOrgAdmin()).toBe(false)
  })
})
