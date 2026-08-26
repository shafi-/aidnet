import { BaseRepository } from './BaseRepository'
import type { ServiceData, UserProfile, UpdateProfileDto } from '@/types'
import { Rpc } from '@/types/rpc'

export class ProfileRepository extends BaseRepository {
  async getMyProfile(): ServiceData<UserProfile> {
    const { data, error } = await this.callRpc<UserProfile[]>(
      Rpc.Profile.GetMyProfile
    )
    // PostgREST wraps RETURNS TABLE functions in an array
    return { data: data?.[0] ?? null, error }
  }

  async getUserProfile(userId: string): ServiceData<UserProfile> {
    const { data, error } = await this.callRpc<UserProfile[]>(
      Rpc.Profile.GetUserProfile,
      { target_user_id: userId }
    )
    return { data: data?.[0] ?? null, error }
  }

  async updateMyProfile(
    data: UpdateProfileDto
  ): Promise<ServiceData<UserProfile>> {
    const res = await this.callRpc<UserProfile[]>(Rpc.Profile.UpdateMyProfile, {
      new_full_name: data.full_name,
      new_avatar_url: data.avatar_url,
      new_metadata: data.metadata,
    })
    return { data: res.data?.[0] ?? null, error: res.error }
  }
}
