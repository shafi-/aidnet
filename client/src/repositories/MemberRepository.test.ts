import { describe, expect, it } from 'vitest'
import { MemberRepository } from './MemberRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aMemberView, aMembership } from '@/testing/fixtures'

describe('MemberRepository', () => {
  it('getMembers scopes by target_org_id', async () => {
    const members = [aMemberView()]
    const gw = createMockRpcGateway({
      get_organization_members: { data: members },
    })
    const res = await new MemberRepository(gw).getMembers('org-1')

    expect(res.data).toEqual(members)
    expect(gw.callsTo('get_organization_members')[0].params).toEqual({
      target_org_id: 'org-1',
    })
  })

  it('addMember defaults role to member', async () => {
    const member = aMemberView()
    const gw = createMockRpcGateway({
      add_organization_member: { data: member },
    })
    const res = await new MemberRepository(gw).addMember(
      'org-1',
      'new@example.com'
    )

    expect(res.data).toEqual(member)
    expect(gw.callsTo('add_organization_member')[0].params).toEqual({
      target_org_id: 'org-1',
      target_user_email: 'new@example.com',
      member_role: 'member',
    })
  })

  it('addMember passes explicit role', async () => {
    const gw = createMockRpcGateway({
      add_organization_member: { data: aMemberView() },
    })
    await new MemberRepository(gw).addMember(
      'org-1',
      'admin@example.com',
      'admin'
    )

    expect(gw.callsTo('add_organization_member')[0].params).toMatchObject({
      member_role: 'admin',
    })
  })

  it('removeMember maps ids to target_* params', async () => {
    const gw = createMockRpcGateway({
      remove_organization_member: { data: true },
    })
    const res = await new MemberRepository(gw).removeMember('org-1', 'user-9')

    expect(res.data).toBe(true)
    expect(gw.callsTo('remove_organization_member')[0].params).toEqual({
      target_org_id: 'org-1',
      target_user_id: 'user-9',
    })
  })

  it('updateMemberRole maps new_role', async () => {
    const gw = createMockRpcGateway({
      update_member_role: { data: aMemberView() },
    })
    await new MemberRepository(gw).updateMemberRole('org-1', 'user-2', 'viewer')

    expect(gw.callsTo('update_member_role')[0].params).toEqual({
      target_org_id: 'org-1',
      target_user_id: 'user-2',
      new_role: 'viewer',
    })
  })

  it('getMembership uses the p_ prefixed param convention', async () => {
    const membership = [aMembership()]
    const gw = createMockRpcGateway({ get_membership: { data: membership } })
    const res = await new MemberRepository(gw).getMembership('org-1')

    expect(res.data).toEqual(membership)
    expect(gw.callsTo('get_membership')[0].params).toEqual({
      p_org_id: 'org-1',
    })
  })
})
