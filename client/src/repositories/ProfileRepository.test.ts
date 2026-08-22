import { describe, expect, it } from 'vitest'
import { ProfileRepository } from './ProfileRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aUserProfile } from '@/testing/fixtures'

describe('ProfileRepository', () => {
  it('getMyProfile calls get_my_profile without params', async () => {
    const profile = aUserProfile()
    const gw = createMockRpcGateway({ get_my_profile: { data: profile } })
    const res = await new ProfileRepository(gw).getMyProfile()

    expect(res.data).toEqual(profile)
    expect(gw.callsTo('get_my_profile')).toEqual([
      { functionName: 'get_my_profile', params: undefined },
    ])
  })

  it('getUserProfile passes target_user_id', async () => {
    const profile = aUserProfile({ id: 'user-2' })
    const gw = createMockRpcGateway({ get_user_profile: { data: profile } })
    const res = await new ProfileRepository(gw).getUserProfile('user-2')

    expect(res.data).toEqual(profile)
    expect(gw.callsTo('get_user_profile')[0].params).toEqual({
      target_user_id: 'user-2',
    })
  })

  it('updateMyProfile maps DTO snake_case fields', async () => {
    const profile = aUserProfile({ full_name: 'New Name' })
    const gw = createMockRpcGateway({ update_my_profile: { data: profile } })
    const res = await new ProfileRepository(gw).updateMyProfile({
      full_name: 'New Name',
      avatar_url: 'https://x/y.png',
      metadata: { theme: 'dark' },
    })

    expect(res.data).toEqual(profile)
    expect(gw.callsTo('update_my_profile')[0].params).toEqual({
      new_full_name: 'New Name',
      new_avatar_url: 'https://x/y.png',
      new_metadata: { theme: 'dark' },
    })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      get_my_profile: { error: 'not authenticated' },
    })
    const res = await new ProfileRepository(gw).getMyProfile()

    expect(res).toEqual({ data: null, error: 'not authenticated' })
  })
})
