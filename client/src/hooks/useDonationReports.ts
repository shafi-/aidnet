'use client'

import { useState, useEffect, useCallback } from 'react'
import { donationReportService } from '@/services/DonationReportService'
import type { DonationReport } from '@/types'

/**
 * Org-side donation review queue for one campaign: pending reports awaiting
 * confirmation plus the confirmed ledger. Confirm/reject reload both lists
 * (confirming changes the campaign's public raised total).
 */
export function useDonationReports(campaignId: string | null) {
  const [pending, setPending] = useState<DonationReport[]>([])
  const [confirmed, setConfirmed] = useState<DonationReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!campaignId) {
      setPending([])
      setConfirmed([])
      return
    }
    setLoading(true)
    setError(null)
    const [pendingRes, confirmedRes] = await Promise.all([
      donationReportService.listByStatus(campaignId, 'pending'),
      donationReportService.listByStatus(campaignId, 'confirmed'),
    ])
    if (pendingRes.error || confirmedRes.error) {
      setError(pendingRes.error ?? confirmedRes.error ?? null)
    }
    setPending(pendingRes.data ?? [])
    setConfirmed(confirmedRes.data ?? [])
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    void load()
  }, [load])

  const confirm = useCallback(
    async (reportId: string) => {
      await donationReportService.confirm(reportId)
      await load()
    },
    [load]
  )

  const reject = useCallback(
    async (reportId: string) => {
      await donationReportService.reject(reportId)
      await load()
    },
    [load]
  )

  return { pending, confirmed, loading, error, confirm, reject }
}
