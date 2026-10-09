'use client'

import { useState, useEffect, useCallback } from 'react'
import { organizationService } from '@/services/OrganizationService'
import type { OrgOverview } from '@/types'

/**
 * Workspace overview numbers for one org (get_org_overview): pending
 * donation confirmations, confirmed donations, raised total and the
 * campaign pipeline counts. Load failures are surfaced, not swallowed —
 * the overview is the operator's landing page.
 */
export function useOrgOverview(orgId: string | null) {
  const [overview, setOverview] = useState<OrgOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId) {
      setOverview(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await organizationService.getOverview(orgId)
    if (data) setOverview(data)
    else setError(err)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  return { overview, loading, error, reload: load }
}
