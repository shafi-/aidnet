import type { ServiceData, SystemStats, OrganizationDetailView } from '@/types'
import type { PaginationParams } from '@/types/pagination'
import { SystemAdminRepository } from '@/repositories/SystemAdminRepository'

export class SystemAdminService {
  constructor(
    private systemAdminRepo: SystemAdminRepository = new SystemAdminRepository()
  ) {}

  async getAllOrgs(
    params?: PaginationParams
  ): ServiceData<OrganizationDetailView[]> {
    return this.systemAdminRepo.getAllOrgs(params)
  }

  async getSystemStats(): ServiceData<SystemStats> {
    return this.systemAdminRepo.getSystemStats()
  }

  async isSystemAdmin(): Promise<boolean> {
    return this.systemAdminRepo.isSystemAdmin()
  }
}

export const systemAdminService = new SystemAdminService()
