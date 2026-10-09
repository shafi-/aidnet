import { BaseRepository } from './BaseRepository'
import type { ServiceData, Invite } from '@/types'
import { Rpc } from '@/types/rpc'

export class InviteRepository extends BaseRepository {
  async generateInvite(
    orgId: string,
    email: string,
    role: string = 'member'
  ): ServiceData<Invite[]> {
    return this.callRpc<Invite[]>(Rpc.Invite.Create, {
      p_organization_id: orgId,
      p_email: email,
      p_role: role,
    })
  }

  async getInvites(orgId: string): ServiceData<Invite[]> {
    return this.callRpc<Invite[]>(Rpc.Invite.GetMany, {
      p_organization_id: orgId,
    })
  }

  async validateInvite(
    token: string,
    email: string
  ): ServiceData<string | null> {
    return this.callRpc<string>(Rpc.Invite.Validate, {
      p_token: token,
      p_email: email,
    })
  }

  async acceptInvite(token: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Invite.Accept, {
      p_token: token,
    })
  }

  async revokeInvite(inviteId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Invite.Revoke, {
      p_invite_id: inviteId,
    })
  }
}
