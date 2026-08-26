import type {
  ServiceData,
  OrgRequest,
  OrgRequestWithUserInfo,
  OrgMeta,
} from '@/types'
import {
  OrgRequestRepository,
  OrgMetaRepository,
} from '@/repositories/OrgRequestRepository'

export class OrgRequestService {
  constructor(
    private orgRequestRepo: OrgRequestRepository = new OrgRequestRepository(),
    private orgMetaRepo: OrgMetaRepository = new OrgMetaRepository()
  ) {}

  async submitRequest(
    orgName: string,
    orgSlug: string,
    orgDescription?: string
  ): ServiceData<string> {
    return this.orgRequestRepo.submitRequest(orgName, orgSlug, orgDescription)
  }

  async getMyRequests(): ServiceData<OrgRequest[]> {
    return this.orgRequestRepo.getMyRequests()
  }

  async getAllRequests(): ServiceData<OrgRequestWithUserInfo[]> {
    return this.orgRequestRepo.getAllRequests()
  }

  // system_admin functions for request management
  async approveRequest(requestId: string): ServiceData<string> {
    const { data, error } = await this.orgRequestRepo.approveRequest(requestId)
    if (error) {
      return { data: null, error }
    }
    return { data, error: null }
  }

  async rejectRequest(
    requestId: string,
    reason?: string
  ): ServiceData<boolean> {
    const { data, error } = await this.orgRequestRepo.rejectRequest(
      requestId,
      reason
    )
    if (error) {
      return { data: null, error }
    }
    return { data, error: null }
  }

  async getOrgMeta(orgId: string): ServiceData<OrgMeta> {
    return this.orgMetaRepo.getOrgMeta(orgId)
  }

  async updateOrgMeta(
    orgId: string,
    updates: Partial<OrgMeta>
  ): ServiceData<boolean> {
    const { data, error } = await this.orgMetaRepo.updateOrgMeta(orgId, updates)
    if (error) {
      return { data: null, error }
    }
    return { data, error: null }
  }
}

export const orgRequestService = new OrgRequestService()
