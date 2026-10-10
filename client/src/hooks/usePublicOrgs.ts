'use client'

import { useState, useEffect, useCallback } from 'react'
import { publicOrgService, type PublicOrg } from '@/services/PublicOrgService'

export function usePublicOrgs() {
  const [orgs, setOrgs] = useState<PublicOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrgs = useCallback(async () => {
    try {
      const { data, error: rpcError } = await publicOrgService.getPublicOrgs()
      if (rpcError) {
        setError(rpcError)
        setOrgs([])
      } else {
        setOrgs((data ?? []) as PublicOrg[])
        setError(null)
      }
    } catch {
      setError('Failed to load organizations')
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrgs()
  }, [loadOrgs])

  return { orgs, loading, error, refetch: loadOrgs }
}
