import { describe, expect, it, vi } from 'vitest'
import { InviteService } from './InviteService'
import { InviteRepository } from '@/repositories/InviteRepository'
import { anInvite, anInviteValidation } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('InviteService', () => {
  it('generateInvite forwards default role', async () => {
    const generateInvite = vi.fn().mockResolvedValue(ok(anInvite()))
    const svc = new InviteService(
      mockRepository<InviteRepository>({ generateInvite })
    )

    const res = await svc.generateInvite('org-1', 'new@example.com')

    expect(generateInvite).toHaveBeenCalledWith(
      'org-1',
      'new@example.com',
      'member'
    )
    expect(res.data?.email).toBe('new@example.com')
  })

  it('getInvites delegates org id', async () => {
    const getInvites = vi.fn().mockResolvedValue(ok([anInvite()]))
    const svc = new InviteService(
      mockRepository<InviteRepository>({ getInvites })
    )

    const res = await svc.getInvites('org-1')

    expect(getInvites).toHaveBeenCalledWith('org-1')
    expect(res.data).toHaveLength(1)
  })

  it('validateInvite and acceptInvite pass tokens through', async () => {
    const validateInvite = vi.fn().mockResolvedValue(ok([anInviteValidation()]))
    const acceptInvite = vi.fn().mockResolvedValue(ok(true))
    const svc = new InviteService(
      mockRepository<InviteRepository>({ validateInvite, acceptInvite })
    )

    const validated = await svc.validateInvite('tok-1')
    const accepted = await svc.acceptInvite('tok-1')

    expect(validateInvite).toHaveBeenCalledWith('tok-1')
    expect(acceptInvite).toHaveBeenCalledWith('tok-1')
    expect(validated.data?.[0].invite_email).toBe('new@example.com')
    expect(accepted).toEqual(ok(true))
  })

  it('revokeInvite delegates and propagates errors', async () => {
    const revokeInvite = vi
      .fn()
      .mockResolvedValueOnce(ok(true))
      .mockResolvedValueOnce({ data: null, error: 'already revoked' })
    const svc = new InviteService(
      mockRepository<InviteRepository>({ revokeInvite })
    )

    expect(await svc.revokeInvite('inv-1')).toEqual(ok(true))
    expect(await svc.revokeInvite('inv-1')).toEqual({
      data: null,
      error: 'already revoked',
    })
  })
})
