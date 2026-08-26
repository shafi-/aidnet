'use client'

import { useState, useEffect, useCallback } from 'react'
import { orgSubscriptionService } from '@/services/OrgSubscriptionService'
import type {
  CurrentSubscription,
  SubscriptionPlan,
  SubscriptionHistoryView,
} from '@/types'
import { normalizeFeatures } from '@/lib/normalizeFeatures'

export function useBilling(orgId: string) {
  const [currentPlan, setCurrentPlan] = useState<CurrentSubscription | null>(
    null
  )
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [history, setHistory] = useState<SubscriptionHistoryView[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(
    'monthly'
  )

  const load = useCallback(async () => {
    const [currentResult, plansResult, historyResult] = await Promise.all([
      orgSubscriptionService.getMySubscription(orgId),
      orgSubscriptionService.getPlans(),
      orgSubscriptionService.getHistory(orgId),
    ])

    if (currentResult.data) {
      const cp = currentResult.data
      setCurrentPlan({ ...cp, features: normalizeFeatures(cp.features) })
    }
    if (plansResult.data) {
      setPlans(
        plansResult.data.map(p => ({
          ...p,
          features: normalizeFeatures(p.features),
        }))
      )
    }
    if (historyResult.data) setHistory(historyResult.data)

    setLoading(false)
  }, [orgId])

  useEffect(() => {
    load()
  }, [load])

  const subscribe = async (planId: string) => {
    setPurchasing(planId)
    const { error } = await orgSubscriptionService.subscribe(
      orgId,
      planId,
      billingPeriod
    )
    if (!error) load()
    setPurchasing(null)
  }

  const changePlan = async (planId: string) => {
    setPurchasing(planId)
    const { error } = await orgSubscriptionService.changePlan(
      orgId,
      planId,
      billingPeriod
    )
    if (!error) load()
    setPurchasing(null)
  }

  const cancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return
    await orgSubscriptionService.cancel(orgId)
    load()
  }

  return {
    currentPlan,
    plans,
    history,
    loading,
    purchasing,
    billingPeriod,
    setBillingPeriod,
    subscribe,
    changePlan,
    cancel,
  }
}

export type BillingController = ReturnType<typeof useBilling>
