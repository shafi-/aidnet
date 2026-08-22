import { describe, expect, it, vi } from 'vitest'
import { SystemAdminSubscriptionService } from './SystemAdminSubscriptionService'
import { SystemAdminSubscriptionRepository } from '@/repositories/SystemAdminSubscriptionRepository'
import { aSubscriptionPlan, anOrgSubscriptionView } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('SystemAdminSubscriptionService', () => {
  it('createPlan delegates args in order', async () => {
    const createPlan = vi.fn().mockResolvedValue(ok(aSubscriptionPlan()))
    const svc = new SystemAdminSubscriptionService(
      mockRepository<SystemAdminSubscriptionRepository>({ createPlan })
    )

    const res = await svc.createPlan('Pro', 'desc', 1000, 10000, ['f1'])

    expect(createPlan).toHaveBeenCalledWith('Pro', 'desc', 1000, 10000, ['f1'])
    expect(res.data?.name).toBe('Pro')
  })

  it('updatePlan delegates partial data', async () => {
    const updatePlan = vi
      .fn()
      .mockResolvedValue(ok(aSubscriptionPlan({ is_active: false })))
    const svc = new SystemAdminSubscriptionService(
      mockRepository<SystemAdminSubscriptionRepository>({ updatePlan })
    )

    const res = await svc.updatePlan('plan-pro', { is_active: false })

    expect(updatePlan).toHaveBeenCalledWith('plan-pro', { is_active: false })
    expect(res.data?.is_active).toBe(false)
  })

  it('getOrgSubscriptions delegates without params', async () => {
    const rows = [anOrgSubscriptionView()]
    const getOrgSubscriptions = vi.fn().mockResolvedValue(ok(rows))
    const svc = new SystemAdminSubscriptionService(
      mockRepository<SystemAdminSubscriptionRepository>({ getOrgSubscriptions })
    )

    const res = await svc.getOrgSubscriptions()

    expect(getOrgSubscriptions).toHaveBeenCalledTimes(1)
    expect(res).toEqual(ok(rows))
  })

  it('pause and unpause delegate org ids and propagate errors', async () => {
    const pauseSubscription = vi.fn().mockResolvedValue(ok(true))
    const unpauseSubscription = vi
      .fn()
      .mockResolvedValueOnce(ok(true))
      .mockResolvedValueOnce({ data: null, error: 'not paused' })
    const svc = new SystemAdminSubscriptionService(
      mockRepository<SystemAdminSubscriptionRepository>({
        pauseSubscription,
        unpauseSubscription,
      })
    )

    await svc.pauseSubscription('org-1')
    expect(pauseSubscription).toHaveBeenCalledWith('org-1')

    expect(await svc.unpauseSubscription('org-1')).toEqual(ok(true))
    expect(await svc.unpauseSubscription('org-2')).toEqual({
      data: null,
      error: 'not paused',
    })
  })
})
