import type { ServiceData, MemberView, Membership } from '@/types'
import { MemberRepository } from '@/repositories/MemberRepository'

export class MemberService {
  constructor(private memberRepo: MemberRepository = new MemberRepository()) {}

  async getMembers(orgId: string): ServiceData<MemberView[]> {
    return this.memberRepo.getMembers(orgId)
  }

  async addMember(
    orgId: string,
    email: string,
    role: string = 'member'
  ): ServiceData<MemberView> {
    return this.memberRepo.addMember(orgId, email, role)
  }

  async removeMember(orgId: string, userId: string): ServiceData<boolean> {
    return this.memberRepo.removeMember(orgId, userId)
  }

  async updateMemberRole(
    orgId: string,
    userId: string,
    newRole: string
  ): ServiceData<MemberView> {
    return this.memberRepo.updateMemberRole(orgId, userId, newRole)
  }

  async getMembership(orgId: string): ServiceData<Membership[]> {
    return this.memberRepo.getMembership(orgId)
  }
}

export const memberService = new MemberService()
