import { describe, expect, it, vi } from 'vitest'
import { ProfileService } from './ProfileService'
import { ProfileRepository } from '@/repositories/ProfileRepository'
import { aUserProfile } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('ProfileService', () => {
  it('getMyProfile delegates without params', async () => {
    const profile = aUserProfile()
    const getMyProfile = vi.fn().mockResolvedValue(ok(profile))
    const svc = new ProfileService(
      mockRepository<ProfileRepository>({ getMyProfile })
    )

    const res = await svc.getMyProfile()

    expect(getMyProfile).toHaveBeenCalledTimes(1)
    expect(res).toEqual(ok(profile))
  })

  it('getUserProfile passes target user id', async () => {
    const other = aUserProfile({ id: 'user-2' })
    const getUserProfile = vi.fn().mockResolvedValue(ok(other))
    const svc = new ProfileService(
      mockRepository<ProfileRepository>({ getUserProfile })
    )

    const res = await svc.getUserProfile('user-2')

    expect(getUserProfile).toHaveBeenCalledWith('user-2')
    expect(res.data?.id).toBe('user-2')
  })

  it('updateMyProfile delegates the DTO untouched and propagates errors', async () => {
    const dto = { full_name: 'Renamed', avatar_url: undefined }
    const updateMyProfile = vi
      .fn()
      .mockResolvedValueOnce(ok(aUserProfile({ full_name: 'Renamed' })))
      .mockResolvedValueOnce({ data: null, error: 'validation failed' })
    const svc = new ProfileService(
      mockRepository<ProfileRepository>({ updateMyProfile })
    )

    const updated = await svc.updateMyProfile(dto)

    expect(updateMyProfile).toHaveBeenCalledWith(dto)
    expect(updated.data?.full_name).toBe('Renamed')
    expect(await svc.updateMyProfile(dto)).toEqual({
      data: null,
      error: 'validation failed',
    })
  })
})
