import { describe, expect, it } from 'vitest'
import { OrgSubscriptionRepository } from './OrgSubscriptionRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import {
  aSubscriptionPlan,
  aCurrentSubscription,
  anOrgSubscription,
  aSubscriptionHistoryView,
} from '@/testing/fixtures'

describe('OrgSubscriptionRepository', () => {
  it('getPlans calls get_subscription_plans without params', async () => {
    const plans = [aSubscriptionPlan()]
    const gw = createMockRpcGateway({ get_subscription_plans: { data: plans } })
    const res = await new OrgSubscriptionRepository(gw).getPlans()

    expect(res.data).toEqual(plans)
    expect(gw.callsTo('get_subscription_plans')).toEqual([
      { functionName: 'get_subscription_plans', params: undefined },
    ])
  })

  it('getMySubscription returns raw rows for service unwrap', async () => {
    const rows = [aCurrentSubscription()]
    const gw = createMockRpcGateway({ get_my_subscription: { data: rows } })
    const res = await new OrgSubscriptionRepository(gw).getMySubscription(
      'org-1'
    )

    expect(res.data).toEqual(rows)
    expect(gw.callsTo('get_my_subscription')[0].params).toEqual({
      p_org_id: 'org-1',
    })
  })

  it('getHistory scopes by p_org_id', async () => {
    const rows = [aSubscriptionHistoryView()]
    const gw = createMockRpcGateway({
      get_subscription_history: { data: rows },
    })
    const res = await new OrgSubscriptionRepository(gw).getHistory('org-1')

    expect(res.data).toEqual(rows)
    expect(gw.callsTo('get_subscription_history')[0].params).toEqual({
      p_org_id: 'org-1',
    })
  })

  it('subscribe maps plan and billing period', async () => {
    const sub = anOrgSubscription()
    const gw = createMockRpcGateway({ subscribe_to_plan: { data: sub } })
    const res = await new OrgSubscriptionRepository(gw).subscribe(
      'org-1',
      'plan-pro',
      'yearly'
    )

    expect(res.data).toEqual(sub)
    expect(gw.callsTo('subscribe_to_plan')[0].params).toEqual({
      p_org_id: 'org-1',
      p_plan_id: 'plan-pro',
      p_billing_period: 'yearly',
    })
  })

  it('changePlan uses p_new_plan_id', async () => {
    const sub = anOrgSubscription({ plan_id: 'plan-enterprise' })
    const gw = createMockRpcGateway({ change_plan: { data: sub } })
    await new OrgSubscriptionRepository(gw).changePlan(
      'org-1',
      'plan-enterprise',
      'monthly'
    )

    expect(gw.callsTo('change_plan')[0].params).toEqual({
      p_org_id: 'org-1',
      p_new_plan_id: 'plan-enterprise',
      p_billing_period: 'monthly',
    })
  })

  it('cancel and hasFeature pass p_org_id', async () => {
    const gw = createMockRpcGateway({
      cancel_subscription: { data: true },
      has_feature: { data: true },
    })
    const cancelled = await new OrgSubscriptionRepository(gw).cancel('org-1')
    const feature = await new OrgSubscriptionRepository(gw).hasFeature(
      'org-1',
      'custom-domain'
    )

    expect(cancelled.data).toBe(true)
    expect(feature.data).toBe(true)
    expect(gw.callsTo('cancel_subscription')[0].params).toEqual({
      p_org_id: 'org-1',
    })
    expect(gw.callsTo('has_feature')[0].params).toEqual({
      p_org_id: 'org-1',
      p_feature: 'custom-domain',
    })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      subscribe_to_plan: { error: 'plan inactive' },
    })
    const res = await new OrgSubscriptionRepository(gw).subscribe(
      'org-1',
      'plan-pro',
      'monthly'
    )

    expect(res).toEqual({ data: null, error: 'plan inactive' })
  })
})
