import type {
  ServiceData,
  OrganizationView,
  OrganizationDetailView,
} from '@/types'
import { OrganizationRepository } from '@/repositories/OrganizationRepository'

export class OrganizationService {
  constructor(
    private orgRepo: OrganizationRepository = new OrganizationRepository()
  ) {}

  async createOrganization(
    name: string,
    slug: string,
    description?: string,
    settings?: Record<string, unknown>
  ): ServiceData<OrganizationView> {
    return this.orgRepo.createOrganization(name, slug, description, settings)
  }

  async getMyOrganizations(): ServiceData<OrganizationView[]> {
    return this.orgRepo.getMyOrganizations()
  }

  async getOrganization(orgId: string): ServiceData<OrganizationDetailView> {
    const { data, error } = await this.orgRepo.getOrganization(orgId)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async updateOrganization(
    orgId: string,
    data: {
      name?: string
      slug?: string
      description?: string
      settings?: Record<string, unknown>
    }
  ): ServiceData<OrganizationView> {
    return this.orgRepo.updateOrganization(orgId, data)
  }

  async deleteOrganization(orgId: string): ServiceData<boolean> {
    return this.orgRepo.deleteOrganization(orgId)
  }
}

export const organizationService = new OrganizationService()
