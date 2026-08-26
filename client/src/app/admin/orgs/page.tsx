'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { systemAdminService } from '@/services/SystemAdminService'
import { organizationService } from '@/services/OrganizationService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useState, useEffect, useCallback } from 'react'
import type { OrganizationDetailView } from '@/types'
import Link from 'next/link'

export default function AdminOrgsPage() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [orgs, setOrgs] = useState<OrganizationDetailView[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const loadOrgs = useCallback(async () => {
    const { data } = await systemAdminService.getAllOrgs()
    if (data) setOrgs(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) loadOrgs()
  }, [isSystemAdmin, loadOrgs])

  const handleSetStatus = async (
    orgId: string,
    status: 'active' | 'suspended'
  ) => {
    setFeedback(null)
    setActionLoading(true)
    const { error } = await organizationService.setOrgStatus(orgId, status)
    setActionLoading(false)
    if (error) {
      setFeedback({
        type: 'error',
        message: error || 'Failed to update organization status',
      })
    } else {
      setFeedback({
        type: 'success',
        message: `Organization status updated to ${status}.`,
      })
      await loadOrgs()
    }
  }

  if (adminLoading)
    return (
      <AppLayout>
        <div>Loading...</div>
      </AppLayout>
    )

  if (!isSystemAdmin) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            You don&apos;t have permission to access this page.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to home
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">All Organizations</h1>
        {feedback && (
          <div
            className={`rounded-md p-4 ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgs.map(org => {
                  const isSuspended = org.status === 'suspended'
                  return (
                    <tr key={org.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        {org.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {org.slug}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {org.member_count}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            isSuspended
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <button
                          onClick={() =>
                            handleSetStatus(
                              org.id,
                              isSuspended ? 'active' : 'suspended'
                            )
                          }
                          disabled={actionLoading}
                          className={`rounded-md px-3 py-2 text-xs font-medium text-white ${
                            isSuspended
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-red-600 hover:bg-red-700'
                          } disabled:opacity-50`}
                        >
                          {isSuspended ? 'Activate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
