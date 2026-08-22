import { describe, expect, it, vi } from 'vitest'
import { MemberService } from './MemberService'
import { MemberRepository } from '@/repositories/MemberRepository'
import { aMemberView, aMembership } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('MemberService', () => {
  it('getMembers delegates org id', async () => {
    const getMembers = vi.fn().mockResolvedValue(ok([aMemberView()]))
    const svc = new MemberService(
      mockRepository<MemberRepository>({ getMembers })
    )

    const res = await svc.getMembers('org-1')

    expect(getMembers).toHaveBeenCalledWith('org-1')
    expect(res.data).toHaveLength(1)
  })

  it('addMember forwards default role', async () => {
    const addMember = vi.fn().mockResolvedValue(ok(aMemberView()))
    const svc = new MemberService(
      mockRepository<MemberRepository>({ addMember })
    )

    await svc.addMember('org-1', 'new@example.com')

    expect(addMember).toHaveBeenCalledWith('org-1', 'new@example.com', 'member')
  })

  it('removeMember and updateMemberRole delegate args', async () => {
    const removeMember = vi.fn().mockResolvedValue(ok(true))
    const updateMemberRole = vi
      .fn()
      .mockResolvedValue(ok(aMemberView({ role: 'admin' })))
    const svc = new MemberService(
      mockRepository<MemberRepository>({ removeMember, updateMemberRole })
    )

    const removed = await svc.removeMember('org-1', 'user-2')
    const updated = await svc.updateMemberRole('org-1', 'user-2', 'admin')

    expect(removed).toEqual(ok(true))
    expect(updateMemberRole).toHaveBeenCalledWith('org-1', 'user-2', 'admin')
    expect(updated.data?.role).toBe('admin')
  })

  it('getMembership returns raw rows and propagates errors', async () => {
    const membership = [aMembership()]
    const getMembership = vi
      .fn()
      .mockResolvedValueOnce(ok(membership))
      .mockResolvedValueOnce({ data: null, error: 'not a member' })
    const svc = new MemberService(
      mockRepository<MemberRepository>({ getMembership })
    )

    expect(await svc.getMembership('org-1')).toEqual(ok(membership))
    expect(await svc.getMembership('org-2')).toEqual({
      data: null,
      error: 'not a member',
    })
  })
})
