import { BaseRepository } from './BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export interface PublicOrg {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

export class PublicOrgRepository extends BaseRepository {
  async getPublicOrg(slug: string): ServiceData<PublicOrg[]> {
    return this.callRpc<PublicOrg[]>(Rpc.Public.GetOrgBySlug, {
      org_slug: slug,
    })
  }
}
