import { describe, expect, it } from 'vitest'
import { SystemAdminSubscriptionRepository } from './SystemAdminSubscriptionRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aSubscriptionPlan, anOrgSubscriptionView } from '@/testing/fixtures'

describe('SystemAdminSubscriptionRepository', () => {
  it('createPlan serializes features array to JSON string', async () => {
    const plan = aSubscriptionPlan()
    const gw = createMockRpcGateway({
      create_subscription_plan: { data: plan },
    })
    const res = await new SystemAdminSubscriptionRepository(gw).createPlan(
      'Pro',
      'desc',
      1000,
      10000,
      ['feature-a', 'feature-b']
    )

    expect(res.data).toEqual(plan)
    expect(gw.callsTo('create_subscription_plan')[0].params).toEqual({
      p_name: 'Pro',
      p_description: 'desc',
      p_price_monthly: 1000,
      p_price_yearly: 10000,
      p_features: JSON.stringify(['feature-a', 'feature-b']),
    })
  })

  it('updatePlan nulls unspecified fields and serializes features only when present', async () => {
    const plan = aSubscriptionPlan({ name: 'Pro Max' })
    const gw = createMockRpcGateway({
      update_subscription_plan: { data: plan },
    })
    const res = await new SystemAdminSubscriptionRepository(gw).updatePlan(
      'plan-pro',
      {
        name: 'Pro Max',
        features: ['f1'],
        is_active: false,
      }
    )

    expect(res.data).toEqual(plan)
    expect(gw.callsTo('update_subscription_plan')[0].params).toEqual({
      p_plan_id: 'plan-pro',
      p_name: 'Pro Max',
      p_description: null,
      p_price_monthly: null,
      p_price_yearly: null,
      p_features: JSON.stringify(['f1']),
      p_is_active: false,
    })
  })

  it('updatePlan leaves features null when not provided', async () => {
    const gw = createMockRpcGateway({
      update_subscription_plan: { data: aSubscriptionPlan() },
    })
    await new SystemAdminSubscriptionRepository(gw).updatePlan('plan-pro', {})

    expect(gw.callsTo('update_subscription_plan')[0].params).toMatchObject({
      p_features: null,
    })
  })

  it('getOrgSubscriptions lists all orgs without params', async () => {
    const rows = [anOrgSubscriptionView()]
    const gw = createMockRpcGateway({
      get_organization_subscriptions: { data: rows },
    })
    const res = await new SystemAdminSubscriptionRepository(
      gw
    ).getOrgSubscriptions()

    expect(res.data).toEqual(rows)
    expect(gw.callsTo('get_organization_subscriptions')).toEqual([
      { functionName: 'get_organization_subscriptions', params: undefined },
    ])
  })

  it('pause and unpause pass p_org_id', async () => {
    const gw = createMockRpcGateway({
      pause_subscription: { data: true },
      unpause_subscription: { data: true },
    })
    await new SystemAdminSubscriptionRepository(gw).pauseSubscription('org-1')
    await new SystemAdminSubscriptionRepository(gw).unpauseSubscription('org-1')

    expect(gw.callsTo('pause_subscription')[0].params).toEqual({
      p_org_id: 'org-1',
    })
    expect(gw.callsTo('unpause_subscription')[0].params).toEqual({
      p_org_id: 'org-1',
    })
  })
})
