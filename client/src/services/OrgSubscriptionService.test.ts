import { describe, expect, it, vi } from 'vitest'
import { OrgSubscriptionService } from './OrgSubscriptionService'
import { OrgSubscriptionRepository } from '@/repositories/OrgSubscriptionRepository'
import {
  aSubscriptionPlan,
  aCurrentSubscription,
  aSubscriptionHistoryView,
} from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('OrgSubscriptionService', () => {
  it('getPlans delegates without params', async () => {
    const plans = [aSubscriptionPlan()]
    const getPlans = vi.fn().mockResolvedValue(ok(plans))
    const svc = new OrgSubscriptionService(
      mockRepository<OrgSubscriptionRepository>({ getPlans })
    )

    const res = await svc.getPlans()

    expect(getPlans).toHaveBeenCalledTimes(1)
    expect(res).toEqual(ok(plans))
  })

  it('getMySubscription unwraps the single table row', async () => {
    const current = aCurrentSubscription()
    const getMySubscription = vi.fn().mockResolvedValue(ok([current]))
    const svc = new OrgSubscriptionService(
      mockRepository<OrgSubscriptionRepository>({ getMySubscription })
    )

    const res = await svc.getMySubscription('org-1')

    expect(getMySubscription).toHaveBeenCalledWith('org-1')
    expect(res).toEqual(ok(current))
  })

  it('getMySubscription returns null when rows are empty', async () => {
    const getMySubscription = vi.fn().mockResolvedValue(ok([]))
    const svc = new OrgSubscriptionService(
      mockRepository<OrgSubscriptionRepository>({ getMySubscription })
    )

    expect(await svc.getMySubscription('org-1')).toEqual({
      data: null,
      error: null,
    })
  })

  it('getHistory delegates org id', async () => {
    const history = [aSubscriptionHistoryView()]
    const getHistory = vi.fn().mockResolvedValue(ok(history))
    const svc = new OrgSubscriptionService(
      mockRepository<OrgSubscriptionRepository>({ getHistory })
    )

    const res = await svc.getHistory('org-1')

    expect(getHistory).toHaveBeenCalledWith('org-1')
    expect(res).toEqual(ok(history))
  })

  it('subscribe, changePlan and cancel delegate args', async () => {
    const subscribe = vi.fn().mockResolvedValue(ok({ id: 'sub-1' }))
    const changePlan = vi.fn().mockResolvedValue(ok({ id: 'sub-1' }))
    const cancel = vi.fn().mockResolvedValue(ok(true))
    const svc = new OrgSubscriptionService(
      mockRepository<OrgSubscriptionRepository>({
        subscribe,
        changePlan,
        cancel,
      })
    )

    await svc.subscribe('org-1', 'plan-pro', 'yearly')
    await svc.changePlan('org-1', 'plan-enterprise', 'monthly')
    const cancelled = await svc.cancel('org-1')

    expect(subscribe).toHaveBeenCalledWith('org-1', 'plan-pro', 'yearly')
    expect(changePlan).toHaveBeenCalledWith(
      'org-1',
      'plan-enterprise',
      'monthly'
    )
    expect(cancelled).toEqual(ok(true))
  })

  it('hasFeature delegates and propagates errors untouched', async () => {
    const hasFeature = vi
      .fn()
      .mockResolvedValueOnce(ok(true))
      .mockResolvedValueOnce({ data: null, error: 'no subscription' })
    const svc = new OrgSubscriptionService(
      mockRepository<OrgSubscriptionRepository>({ hasFeature })
    )

    expect(await svc.hasFeature('org-1', 'custom-domain')).toEqual(ok(true))
    expect(await svc.hasFeature('org-2', 'custom-domain')).toEqual({
      data: null,
      error: 'no subscription',
    })
  })
})
