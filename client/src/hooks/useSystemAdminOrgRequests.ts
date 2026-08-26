import { useState, useEffect } from 'react'
import { orgRequestService } from '@/services/OrgRequestService'
import { organizationService } from '@/services/OrganizationService'
import type { OrgRequestWithUserInfo } from '@/types'

export function useSystemAdminOrgRequests() {
  const [requests, setRequests] = useState<OrgRequestWithUserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await orgRequestService.getAllRequests()
    if (error) {
      setError(error)
    } else if (data) {
      setRequests(data)
    }
    setLoading(false)
  }

  const approveRequest = async (requestId: string) => {
    setActionLoading(true)
    const { data, error } = await orgRequestService.approveRequest(requestId)
    setActionLoading(false)

    if (error) {
      return { success: false, error }
    }

    await loadRequests()
    return { success: true, orgId: data }
  }

  const rejectRequest = async (requestId: string, reason?: string) => {
    setActionLoading(true)
    const { data, error } = await orgRequestService.rejectRequest(
      requestId,
      reason
    )
    setActionLoading(false)

    if (error) {
      return { success: false, error }
    }

    await loadRequests()
    return { success: true }
  }

  const setOrgStatus = async (
    orgId: string,
    status: 'active' | 'suspended'
  ) => {
    setActionLoading(true)
    const { data, error } = await organizationService.setOrgStatus(
      orgId,
      status
    )
    setActionLoading(false)

    if (error) {
      return { success: false, error }
    }

    await loadRequests()
    return { success: true }
  }

  return {
    requests,
    loading,
    error,
    actionLoading,
    approveRequest,
    rejectRequest,
    setOrgStatus,
    refresh: loadRequests,
  }
}
