import type { ServiceData, SystemStats, OrganizationDetailView } from '@/types'
import { SystemAdminRepository } from '@/repositories/SystemAdminRepository'

export class SystemAdminService {
  constructor(
    private systemAdminRepo: SystemAdminRepository = new SystemAdminRepository()
  ) {}

  async getAllOrgs(): ServiceData<OrganizationDetailView[]> {
    return this.systemAdminRepo.getAllOrgs()
  }

  async getSystemStats(): ServiceData<SystemStats> {
    return this.systemAdminRepo.getSystemStats()
  }

  async isSystemAdmin(): Promise<boolean> {
    return this.systemAdminRepo.isSystemAdmin()
  }
}

export const systemAdminService = new SystemAdminService()
