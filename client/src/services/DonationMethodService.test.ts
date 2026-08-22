import { describe, expect, it, vi } from 'vitest'
import { DonationMethodService } from './DonationMethodService'
import { DonationMethodRepository } from '@/repositories/DonationMethodRepository'
import { aDonationMethod } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('DonationMethodService', () => {
  it('getDonationMethods delegates org id', async () => {
    const getDonationMethods = vi
      .fn()
      .mockResolvedValue(ok([aDonationMethod()]))
    const svc = new DonationMethodService(
      mockRepository<DonationMethodRepository>({ getDonationMethods })
    )

    const res = await svc.getDonationMethods('org-1')

    expect(getDonationMethods).toHaveBeenCalledWith('org-1')
    expect(res.data).toHaveLength(1)
  })

  it('upsertDonationMethods delegates org id and DTO untouched', async () => {
    const dto = { bkashNumber: '01700-000000', isPreferred: true }
    const upsertDonationMethods = vi
      .fn()
      .mockResolvedValue(ok(aDonationMethod()))
    const svc = new DonationMethodService(
      mockRepository<DonationMethodRepository>({ upsertDonationMethods })
    )

    const res = await svc.upsertDonationMethods('org-1', dto)

    expect(upsertDonationMethods).toHaveBeenCalledWith('org-1', dto)
    expect(res.data?.id).toBe('dm-1')
  })

  it('propagates errors untouched', async () => {
    const getDonationMethods = vi
      .fn()
      .mockResolvedValue({ data: null, error: 'denied' })
    const svc = new DonationMethodService(
      mockRepository<DonationMethodRepository>({ getDonationMethods })
    )

    expect(await svc.getDonationMethods('org-1')).toEqual({
      data: null,
      error: 'denied',
    })
  })
})
