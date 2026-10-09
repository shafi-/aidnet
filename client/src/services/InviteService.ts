import type { ServiceData, Invite } from '@/types'
import { InviteRepository } from '@/repositories/InviteRepository'

export class InviteService {
  constructor(private inviteRepo: InviteRepository = new InviteRepository()) {}

  async generateInvite(
    orgId: string,
    email: string,
    role: string = 'member'
  ): ServiceData<Invite> {
    // create_invite RETURNS SETOF invites → PostgREST wraps the row in an
    // array; unwrap so callers see the created invite (or null). The inviter
    // shares this row's token — no invite email is sent.
    const { data, error } = await this.inviteRepo.generateInvite(
      orgId,
      email,
      role
    )
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async getInvites(orgId: string): ServiceData<Invite[]> {
    return this.inviteRepo.getInvites(orgId)
  }

  async validateInvite(
    token: string,
    email: string
  ): ServiceData<string | null> {
    return this.inviteRepo.validateInvite(token, email)
  }

  async acceptInvite(token: string): ServiceData<boolean> {
    return this.inviteRepo.acceptInvite(token)
  }

  async revokeInvite(inviteId: string): ServiceData<boolean> {
    return this.inviteRepo.revokeInvite(inviteId)
  }
}

export const inviteService = new InviteService()
