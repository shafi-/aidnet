import type { ServiceData, Invite, InviteValidation } from '@/types'
import { InviteRepository } from '@/repositories/InviteRepository'

export class InviteService {
  constructor(private inviteRepo: InviteRepository = new InviteRepository()) {}

  async generateInvite(
    orgId: string,
    email: string,
    role: string = 'member'
  ): ServiceData<Invite> {
    return this.inviteRepo.generateInvite(orgId, email, role)
  }

  async getInvites(orgId: string): ServiceData<Invite[]> {
    return this.inviteRepo.getInvites(orgId)
  }

  async validateInvite(token: string): ServiceData<InviteValidation[]> {
    return this.inviteRepo.validateInvite(token)
  }

  async acceptInvite(token: string): ServiceData<boolean> {
    return this.inviteRepo.acceptInvite(token)
  }

  async revokeInvite(inviteId: string): ServiceData<boolean> {
    return this.inviteRepo.revokeInvite(inviteId)
  }
}

export const inviteService = new InviteService()
