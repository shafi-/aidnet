import type { ServiceData, UserProfile, UpdateProfileDto } from '@/types'
import { ProfileRepository } from '@/repositories/ProfileRepository'

export class ProfileService {
  constructor(
    private profileRepo: ProfileRepository = new ProfileRepository()
  ) {}

  async getMyProfile(): ServiceData<UserProfile> {
    return this.profileRepo.getMyProfile()
  }

  async getUserProfile(userId: string): ServiceData<UserProfile> {
    return this.profileRepo.getUserProfile(userId)
  }

  async updateMyProfile(data: UpdateProfileDto): ServiceData<UserProfile> {
    return this.profileRepo.updateMyProfile(data)
  }
}

export const profileService = new ProfileService()
