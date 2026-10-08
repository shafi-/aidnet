'use client'

import { useState, useEffect, useCallback } from 'react'
import { publicCampaignService } from '@/services/PublicCampaignService'
import type { PublicCampaign, PublicCampaignFilters } from '@/types'

export function usePublicCampaigns(filters: PublicCampaignFilters = {}) {
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // `false` must mean "no zakat filter" (show everything), not "exclude
  // zakat campaigns" — the RPC only filters when the arg is non-null.
  const zakat = filters.zakat ? true : null
  const org = filters.org ?? null
  const limit = filters.limit ?? null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: err } =
        await publicCampaignService.getPublicCampaigns({
          zakat,
          org,
          limit,
        })
      if (err) {
        setError(err)
        setCampaigns([])
      } else {
        setCampaigns((data as PublicCampaign[]) ?? [])
        setError(null)
      }
    } catch {
      setError('Failed to load campaigns')
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [zakat, org, limit])

  useEffect(() => {
    load()
  }, [load])

  return { campaigns, loading, error, refetch: load }
}
