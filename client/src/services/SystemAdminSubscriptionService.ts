import type {
  ServiceData,
  SubscriptionPlan,
  OrganizationSubscriptionView,
} from '@/types'
import { SystemAdminSubscriptionRepository } from '@/repositories/SystemAdminSubscriptionRepository'

export class SystemAdminSubscriptionService {
  constructor(
    private systemAdminSubscriptionRepo: SystemAdminSubscriptionRepository = new SystemAdminSubscriptionRepository()
  ) {}

  async createPlan(
    name: string,
    description: string,
    priceMonthly: number,
    priceYearly: number,
    features: string[]
  ): ServiceData<SubscriptionPlan> {
    return this.systemAdminSubscriptionRepo.createPlan(
      name,
      description,
      priceMonthly,
      priceYearly,
      features
    )
  }

  async updatePlan(
    planId: string,
    data: {
      name?: string
      description?: string
      price_monthly?: number
      price_yearly?: number
      features?: string[]
      is_active?: boolean
    }
  ): ServiceData<SubscriptionPlan> {
    return this.systemAdminSubscriptionRepo.updatePlan(planId, data)
  }

  async getOrgSubscriptions(): ServiceData<OrganizationSubscriptionView[]> {
    return this.systemAdminSubscriptionRepo.getOrgSubscriptions()
  }

  async pauseSubscription(orgId: string): ServiceData<boolean> {
    return this.systemAdminSubscriptionRepo.pauseSubscription(orgId)
  }

  async unpauseSubscription(orgId: string): ServiceData<boolean> {
    return this.systemAdminSubscriptionRepo.unpauseSubscription(orgId)
  }
}

export const systemAdminSubscriptionService =
  new SystemAdminSubscriptionService()
