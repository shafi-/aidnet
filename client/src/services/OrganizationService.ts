import type {
  ServiceData,
  OrganizationView,
  OrganizationDetailView,
} from '@/types'
import type { PaginationParams } from '@/types/pagination'
import { OrganizationRepository } from '@/repositories/OrganizationRepository'

export class OrganizationService {
  constructor(
    private orgRepo: OrganizationRepository = new OrganizationRepository()
  ) {}

  // Note: This is now primarily used by system_admin during org request approval
  // Regular users should use org_request flow instead
  async createOrganization(
    name: string,
    slug: string,
    description?: string,
    settings?: Record<string, unknown>
  ): ServiceData<OrganizationView> {
    return this.orgRepo.createOrganization(name, slug, description, settings)
  }

  async getMyOrganizations(
    params?: PaginationParams
  ): ServiceData<OrganizationView[]> {
    return this.orgRepo.getMyOrganizations(params)
  }

  async getOrganization(orgId: string): ServiceData<OrganizationDetailView> {
    const { data, error } = await this.orgRepo.getOrganization(orgId)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  // Note: This now only handles org slug updates
  // Name/description/logo updates should use orgRequestService.updateOrgMeta
  async updateOrganization(
    orgId: string,
    data: {
      name?: string
      slug?: string
      description?: string
    }
  ): ServiceData<OrganizationView> {
    return this.orgRepo.updateOrganization(orgId, data)
  }

  async deleteOrganization(orgId: string): ServiceData<boolean> {
    return this.orgRepo.deleteOrganization(orgId)
  }

  // New method for system_admin to set org status
  async setOrgStatus(
    orgId: string,
    status: 'active' | 'suspended'
  ): ServiceData<boolean> {
    return this.orgRepo.setOrgStatus(orgId, status)
  }
}

export const organizationService = new OrganizationService()
