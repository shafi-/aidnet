import { useState, useEffect, useCallback } from 'react'
import { orgRequestService } from '@/services/OrgRequestService'
import type { OrgRequest, OrgMeta } from '@/types'

export function useOrgRequests() {
  const [requests, setRequests] = useState<OrgRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    const active = true
    setLoading(true)
    setError(null)
    const { data, error } = await orgRequestService.getMyRequests()
    if (!active) return
    if (error) {
      setError(error)
    } else if (data) {
      setRequests(data)
    }
    setLoading(false)
  }

  const submitRequest = async (
    orgName: string,
    orgSlug: string,
    orgDescription?: string
  ) => {
    const { data, error } = await orgRequestService.submitRequest(
      orgName,
      orgSlug,
      orgDescription
    )
    if (error) {
      return { success: false, error }
    }
    await loadRequests()
    return { success: true, requestId: data }
  }

  return {
    requests,
    loading,
    error,
    submitRequest,
    refresh: loadRequests,
  }
}

export function useOrgMeta(orgId: string) {
  const [meta, setMeta] = useState<OrgMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMeta = useCallback(async () => {
    const active = true
    setLoading(true)
    setError(null)
    const { data, error } = await orgRequestService.getOrgMeta(orgId)
    if (!active) return
    if (error) {
      setError(error)
    } else {
      setMeta(data)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    if (orgId) {
      loadMeta()
    }
  }, [orgId, loadMeta])

  const updateMeta = async (updates: Partial<OrgMeta>) => {
    const { error } = await orgRequestService.updateOrgMeta(orgId, updates)
    if (error) {
      return { success: false, error }
    }
    await loadMeta()
    return { success: true }
  }

  return {
    meta,
    loading,
    error,
    updateMeta,
    refresh: loadMeta,
  }
}
