import { BaseRepository } from './BaseRepository'
import type { ServiceData, SystemStats, OrganizationDetailView } from '@/types'
import { Rpc } from '@/types/rpc'

export interface CursorPaginationParams {
  limit?: number
  cursor?: string | null
}

export class SystemAdminRepository extends BaseRepository {
  async getAllOrgs(
    params?: CursorPaginationParams
  ): ServiceData<OrganizationDetailView[]> {
    return this.callRpc<OrganizationDetailView[]>(Rpc.SystemAdmin.GetAllOrgs, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  // Raw PostgREST shape: RETURNS TABLE wraps the single row in an array.
  async getSystemStats(): ServiceData<SystemStats[]> {
    return this.callRpc<SystemStats[]>(Rpc.SystemAdmin.GetStats)
  }

  async isSystemAdmin(): Promise<boolean> {
    const { data, error } = await this.callRpc<boolean>(
      Rpc.SystemAdmin.IsSystemAdmin
    )
    if (error) return false
    return data === true
  }
}
