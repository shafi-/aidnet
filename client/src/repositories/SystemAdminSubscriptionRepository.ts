import { BaseRepository } from './BaseRepository'
import type {
  ServiceData,
  SubscriptionPlan,
  OrganizationSubscriptionView,
} from '@/types'
import { Rpc } from '@/types/rpc'

/**
 * System-admin-only subscription management: plan CRUD and org-subscription
 * administration (list all orgs' subscriptions, pause/unpause).
 * Org-facing operations live in OrgSubscriptionRepository.
 */
export class SystemAdminSubscriptionRepository extends BaseRepository {
  async createPlan(
    name: string,
    description: string,
    priceMonthly: number,
    priceYearly: number,
    features: string[]
  ): ServiceData<SubscriptionPlan> {
    return this.callRpc<SubscriptionPlan>(
      Rpc.SystemAdminSubscription.CreatePlan,
      {
        p_name: name,
        p_description: description,
        p_price_monthly: priceMonthly,
        p_price_yearly: priceYearly,
        p_features: JSON.stringify(features),
      }
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
    return this.callRpc<SubscriptionPlan>(
      Rpc.SystemAdminSubscription.UpdatePlan,
      {
        p_plan_id: planId,
        p_name: data.name ?? null,
        p_description: data.description ?? null,
        p_price_monthly: data.price_monthly ?? null,
        p_price_yearly: data.price_yearly ?? null,
        p_features: data.features ? JSON.stringify(data.features) : null,
        p_is_active: data.is_active ?? null,
      }
    )
  }

  async getOrgSubscriptions(): ServiceData<OrganizationSubscriptionView[]> {
    return this.callRpc<OrganizationSubscriptionView[]>(
      Rpc.SystemAdminSubscription.GetOrgSubscriptions
    )
  }

  async pauseSubscription(orgId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.SystemAdminSubscription.Pause, {
      p_org_id: orgId,
    })
  }

  async unpauseSubscription(orgId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.SystemAdminSubscription.Unpause, {
      p_org_id: orgId,
    })
  }
}
