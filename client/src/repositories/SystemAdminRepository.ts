import { BaseRepository } from './BaseRepository'
import type { ServiceData, SystemStats, OrganizationDetailView } from '@/types'
import { Rpc } from '@/types/rpc'

export class SystemAdminRepository extends BaseRepository {
  async getAllOrgs(): ServiceData<OrganizationDetailView[]> {
    return this.callRpc<OrganizationDetailView[]>(Rpc.SystemAdmin.GetAllOrgs)
  }

  async getSystemStats(): ServiceData<SystemStats> {
    return this.callRpc<SystemStats>(Rpc.SystemAdmin.GetStats)
  }

  async isSystemAdmin(): Promise<boolean> {
    const { data, error } = await this.callRpc<boolean>(
      Rpc.SystemAdmin.IsSystemAdmin
    )
    if (error) return false
    return data === true
  }
}
