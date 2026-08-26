import { describe, expect, it } from 'vitest'
import { InviteRepository } from './InviteRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { anInvite } from '@/testing/fixtures'

describe('InviteRepository', () => {
  it('generateInvite maps args and defaults role to member', async () => {
    const invite = anInvite()
    const gw = createMockRpcGateway({ create_invite: { data: invite } })
    const res = await new InviteRepository(gw).generateInvite(
      'org-1',
      'new@example.com'
    )

    expect(res.data).toEqual(invite)
    expect(gw.callsTo('create_invite')[0].params).toEqual({
      p_organization_id: 'org-1',
      p_email: 'new@example.com',
      p_role: 'member',
    })
  })

  it('getInvites scopes by p_organization_id', async () => {
    const invites = [anInvite()]
    const gw = createMockRpcGateway({ get_invites: { data: invites } })
    const res = await new InviteRepository(gw).getInvites('org-1')

    expect(res.data).toEqual(invites)
    expect(gw.callsTo('get_invites')[0].params).toEqual({
      p_organization_id: 'org-1',
    })
  })

  it('validateInvite passes token and email, returns org name or null', async () => {
    const gw = createMockRpcGateway({ validate_invite: { data: 'Demo Org' } })
    const res = await new InviteRepository(gw).validateInvite(
      'tok-123',
      'new@example.com'
    )

    expect(res.data).toBe('Demo Org')
    expect(gw.callsTo('validate_invite')[0].params).toEqual({
      p_token: 'tok-123',
      p_email: 'new@example.com',
    })

    const miss = createMockRpcGateway({ validate_invite: { data: null } })
    const noMatch = await new InviteRepository(miss).validateInvite(
      'tok-123',
      'wrong@example.com'
    )
    expect(noMatch.data).toBeNull()
  })

  it('acceptInvite passes token', async () => {
    const gw = createMockRpcGateway({ accept_invite: { data: true } })
    const res = await new InviteRepository(gw).acceptInvite('tok-123')

    expect(res.data).toBe(true)
    expect(gw.callsTo('accept_invite')[0].params).toEqual({
      p_token: 'tok-123',
    })
  })

  it('revokeInvite passes invite id', async () => {
    const gw = createMockRpcGateway({ revoke_invite: { data: true } })
    await new InviteRepository(gw).revokeInvite('inv-1')

    expect(gw.callsTo('revoke_invite')[0].params).toEqual({
      p_invite_id: 'inv-1',
    })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      accept_invite: { error: 'invite expired' },
    })
    const res = await new InviteRepository(gw).acceptInvite('tok-old')

    expect(res).toEqual({ data: null, error: 'invite expired' })
  })
})
