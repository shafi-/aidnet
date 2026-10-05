import { BaseRepository } from './BaseRepository'
import type {
  ServiceData,
  OrgRequest,
  OrgRequestWithUserInfo,
  OrgMeta,
} from '@/types'
import { Rpc } from '@/types/rpc'

export class OrgRequestRepository extends BaseRepository {
  async submitRequest(
    orgName: string,
    orgSlug: string,
    orgDescription?: string
  ): ServiceData<string> {
    return this.callRpc<string>(Rpc.OrgRequest.Submit, {
      p_org_name: orgName,
      p_org_slug: orgSlug,
      p_org_description: orgDescription || null,
    })
  }

  async getMyRequests(): ServiceData<OrgRequest[]> {
    return this.callRpc<OrgRequest[]>(Rpc.OrgRequest.GetMy)
  }

  async getAllRequests(): ServiceData<OrgRequestWithUserInfo[]> {
    return this.callRpc<OrgRequestWithUserInfo[]>(Rpc.OrgRequest.GetAll)
  }

  // system_admin functions for request management
  async approveRequest(requestId: string): ServiceData<string> {
    return this.callRpc<string>(Rpc.SystemAdmin.ApproveOrgRequest, {
      p_request_id: requestId,
    })
  }

  async rejectRequest(
    requestId: string,
    reason?: string
  ): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.SystemAdmin.RejectOrgRequest, {
      p_request_id: requestId,
      p_rejection_reason: reason || null,
    })
  }
}

export class OrgMetaRepository extends BaseRepository {
  async getOrgMeta(orgId: string): ServiceData<OrgMeta> {
    const result = await this.callRpc<OrgMeta[]>(Rpc.OrgMeta.Get, {
      p_org_id: orgId,
    })
    // Functions return SETOF, so we return the first item
    return {
      data: result.data?.[0] || null,
      error: result.error,
    }
  }

  async updateOrgMeta(
    orgId: string,
    updates: Partial<OrgMeta>
  ): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.OrgMeta.Update, {
      p_org_id: orgId,
      p_name: updates.name || null,
      p_description: updates.description || null,
      p_logo_url: updates.logo_url || null,
      p_website_url: updates.website_url || null,
      p_contact_email: updates.contact_email || null,
      p_contact_phone: updates.contact_phone || null,
      p_address: updates.address || null,
      p_social_links: updates.social_links || null,
      p_settings: updates.settings || null,
    })
  }
}
