'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminCampaignService } from '@/services/AdminCampaignService'
import type { Campaign } from '@/types'

export function useCampaignAdmin() {
  const [pending, setPending] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: err } = await adminCampaignService.getPendingCampaigns()
      if (err) {
        setError(err)
        setPending([])
      } else {
        setPending((data as Campaign[]) ?? [])
        setError(null)
      }
    } catch {
      setError('Failed to load pending campaigns')
      setPending([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const verify = useCallback(async (campaignId: string, notes?: string) => {
    setActionLoading(true)
    try {
      const { error: err } = await adminCampaignService.verifyCampaign(campaignId, notes)
      if (err) return { error: err }
      await load()
      return { error: null }
    } finally {
      setActionLoading(false)
    }
  }, [load])

  const reject = useCallback(async (campaignId: string, notes?: string) => {
    setActionLoading(true)
    try {
      const { error: err } = await adminCampaignService.rejectCampaign(campaignId, notes)
      if (err) return { error: err }
      await load()
      return { error: null }
    } finally {
      setActionLoading(false)
    }
  }, [load])

  return { pending, loading, error, actionLoading, refetch: load, verify, reject }
}
