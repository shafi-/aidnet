import type {
  ServiceData,
  OrganizationSubscription,
  CurrentSubscription,
  SubscriptionPlan,
  SubscriptionHistoryView,
} from '@/types'
import { OrgSubscriptionRepository } from '@/repositories/OrgSubscriptionRepository'

export class OrgSubscriptionService {
  constructor(
    private orgSubscriptionRepo: OrgSubscriptionRepository = new OrgSubscriptionRepository()
  ) {}

  async getPlans(): ServiceData<SubscriptionPlan[]> {
    return this.orgSubscriptionRepo.getPlans()
  }

  async getMySubscription(orgId: string): ServiceData<CurrentSubscription> {
    const { data, error } =
      await this.orgSubscriptionRepo.getMySubscription(orgId)
    if (error) return { data: null, error }
    // RPC is defined as RETURNS TABLE(...) so PostgREST wraps the row in an array
    return { data: data?.[0] ?? null, error: null }
  }

  async getHistory(orgId: string): ServiceData<SubscriptionHistoryView[]> {
    return this.orgSubscriptionRepo.getHistory(orgId)
  }

  async subscribe(
    orgId: string,
    planId: string,
    billingPeriod: 'monthly' | 'yearly'
  ): ServiceData<OrganizationSubscription> {
    return this.orgSubscriptionRepo.subscribe(orgId, planId, billingPeriod)
  }

  async changePlan(
    orgId: string,
    newPlanId: string,
    billingPeriod: 'monthly' | 'yearly'
  ): ServiceData<OrganizationSubscription> {
    return this.orgSubscriptionRepo.changePlan(orgId, newPlanId, billingPeriod)
  }

  async cancel(orgId: string): ServiceData<boolean> {
    return this.orgSubscriptionRepo.cancel(orgId)
  }

  async hasFeature(orgId: string, feature: string): ServiceData<boolean> {
    return this.orgSubscriptionRepo.hasFeature(orgId, feature)
  }
}

export const orgSubscriptionService = new OrgSubscriptionService()
