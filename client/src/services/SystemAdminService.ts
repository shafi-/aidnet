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

  // get_system_stats is RETURNS TABLE: PostgREST wraps the single row in an
  // array — unwrap it here so consumers read the stats fields directly
  // (AGENTS.md known gotcha; without this the cards render labels only).
  async getSystemStats(): ServiceData<SystemStats> {
    const { data, error } = await this.systemAdminRepo.getSystemStats()
    return { data: data?.[0] ?? null, error }
  }

  async isSystemAdmin(): Promise<boolean> {
    return this.systemAdminRepo.isSystemAdmin()
  }
}

export const systemAdminService = new SystemAdminService()
