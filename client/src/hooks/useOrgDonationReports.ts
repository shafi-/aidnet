'use client'

import { useState, useEffect, useCallback } from 'react'
import { donationReportService } from '@/services/DonationReportService'
import type { OrgDonationReport } from '@/types'

/**
 * Cross-campaign donation reports for one org (list_org_donation_reports):
 * the pending confirmation queue, the confirmed ledger, or both by status.
 * Confirm/reject act on the ledger (confirming moves the public raised
 * total) and reload the list.
 */
export function useOrgDonationReports(
  orgId: string | null,
  status: 'pending' | 'confirmed' | 'rejected' | 'all' = 'pending',
  limit = 100
) {
  const [reports, setReports] = useState<OrgDonationReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId) {
      setReports([])
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await donationReportService.listForOrg(
      orgId,
      status,
      limit
    )
    if (err) setError(err)
    if (data) setReports(data)
    setLoading(false)
  }, [orgId, status, limit])

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

  return { reports, loading, error, confirm, reject, reload: load }
}
