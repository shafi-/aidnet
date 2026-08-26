'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CurrentSubscription } from '@/types'
import { orgSubscriptionService } from '@/services/OrgSubscriptionService'
import { normalizeFeatures } from '@/lib/normalizeFeatures'

export function useSubscription(orgId: string | null) {
  const [currentPlan, setCurrentPlan] = useState<CurrentSubscription | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  const hasFeature = useCallback(
    (feature: string): boolean => {
      return currentPlan?.features?.includes(feature) ?? false
    },
    [currentPlan]
  )

  const loadSubscription = useCallback(async () => {
    if (!orgId) {
      setCurrentPlan(null)
      setLoading(false)
      return
    }

    const active = true
    try {
      const { data, error } =
        await orgSubscriptionService.getMySubscription(orgId)
      if (!active) return
      if (error || !data) {
        setCurrentPlan(null)
      } else {
        setCurrentPlan({ ...data, features: normalizeFeatures(data.features) })
      }
    } catch {
      if (!active) return
      setCurrentPlan(null)
    } finally {
      if (active) setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  return {
    currentPlan,
    loading,
    hasFeature,
    refetch: loadSubscription,
  }
}
