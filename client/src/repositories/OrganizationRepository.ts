import { BaseRepository } from './BaseRepository'
import type {
  ServiceData,
  OrganizationView,
  OrganizationDetailView,
} from '@/types'
import { Rpc } from '@/types/rpc'

export interface CursorPaginationParams {
  limit?: number
  cursor?: string | null
}

export class OrganizationRepository extends BaseRepository {
  // Note: This is now used primarily by system_admin during org request approval
  // Regular users should use org_request flow instead
  async createOrganization(
    name: string,
    slug: string,
    description?: string,
    settings?: Record<string, unknown>
  ): ServiceData<OrganizationView> {
    return this.callRpc<OrganizationView>(Rpc.Org.Create, {
      org_name: name,
      org_slug: slug,
      org_description: description ?? null,
      org_settings: settings ?? null,
    })
  }

  // Lazily provisions (or returns) the caller's own personal org — the
  // self-serve path for individual fundraisers with no organization.
  async ensurePersonalOrg(): ServiceData<string> {
    return this.callRpc<string>(Rpc.Org.EnsurePersonalOrg)
  }

  async getMyOrganizations(
    params?: CursorPaginationParams
  ): ServiceData<OrganizationView[]> {
    return this.callRpc<OrganizationView[]>(Rpc.Org.GetMy, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async getOrganization(orgId: string): ServiceData<OrganizationDetailView[]> {
    return this.callRpc<OrganizationDetailView[]>(Rpc.Org.Get, {
      target_org_id: orgId,
    })
  }

  // Note: This now only handles org status updates (active/suspended)
  // Name/description/logo updates should use OrgMetaRepository.updateOrgMeta
  async updateOrganization(
    orgId: string,
    data: {
      name?: string
      slug?: string
      description?: string
    }
  ): ServiceData<OrganizationView> {
    const params: Record<string, unknown> = { target_org_id: orgId }
    if (data.slug !== undefined) params.new_slug = data.slug
    if (data.name !== undefined) params.new_name = data.name
    if (data.description !== undefined)
      params.new_description = data.description
    return this.callRpc<OrganizationView>(Rpc.Org.Update, params)
  }

  async deleteOrganization(orgId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Org.Delete, {
      target_org_id: orgId,
    })
  }

  // New method for system_admin to set org status
  async setOrgStatus(
    orgId: string,
    status: 'active' | 'suspended'
  ): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.SystemAdmin.SetOrgStatus, {
      p_org_id: orgId,
      p_status: status,
    })
  }
}
