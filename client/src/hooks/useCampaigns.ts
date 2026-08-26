'use client'

import { useState, useEffect, useCallback } from 'react'
import { campaignService } from '@/services/CampaignService'
import type { Campaign, CampaignTag } from '@/types'

export function useCampaigns(orgId: string | null | undefined) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId) {
      setCampaigns([])
      setLoading(false)
      return
    }
    const active = true
    setLoading(true)
    try {
      const { data, error: err } = await campaignService.getCampaigns(orgId)
      if (!active) return
      if (err) {
        setError(err)
        setCampaigns([])
      } else {
        setCampaigns((data as Campaign[]) ?? [])
        setError(null)
      }
    } catch {
      if (!active) return
      setError('Failed to load campaigns')
      setCampaigns([])
    } finally {
      if (active) setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    load()
  }, [load])

  const submit = useCallback(
    async (campaignId: string) => {
      const { error: err } = await campaignService.submitForReview(campaignId)
      if (err) return { error: err }
      await load()
      return { error: null }
    },
    [load]
  )

  const remove = useCallback(
    async (campaignId: string) => {
      const { error: err } = await campaignService.deleteCampaign(campaignId)
      if (err) return { error: err }
      await load()
      return { error: null }
    },
    [load]
  )

  const setTags = useCallback(async (campaignId: string, tagIds: string[]) => {
    const { error: err } = await campaignService.setCampaignTags(
      campaignId,
      tagIds
    )
    if (err) return { error: err }
    return { error: null }
  }, [])

  return { campaigns, loading, error, refetch: load, submit, remove, setTags }
}

export function useCampaignTags() {
  const [tags, setTags] = useState<CampaignTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: err } = await campaignService.getCampaignTags()
      if (err) {
        setError(err)
        setTags([])
      } else {
        setTags((data as CampaignTag[]) ?? [])
        setError(null)
      }
    } catch {
      setError('Failed to load tags')
      setTags([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { tags, loading, error, refetch: load }
}
