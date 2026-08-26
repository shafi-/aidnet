import { useState, useEffect } from 'react'
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
    setLoading(true)
    setError(null)
    const { data, error } = await orgRequestService.getMyRequests()
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

  useEffect(() => {
    if (orgId) {
      loadMeta()
    }
  }, [orgId])

  const loadMeta = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await orgRequestService.getOrgMeta(orgId)
    if (error) {
      setError(error)
    } else {
      setMeta(data)
    }
    setLoading(false)
  }

  const updateMeta = async (updates: Partial<OrgMeta>) => {
    const { data, error } = await orgRequestService.updateOrgMeta(
      orgId,
      updates
    )
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
