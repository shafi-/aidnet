'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useSystemAdminOrgRequests } from '@/hooks/useSystemAdminOrgRequests'
import { AppLayout } from '@/components/layout/AppLayout'

function OrgRequestContent() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const { requests, loading, actionLoading, approveRequest, rejectRequest } =
    useSystemAdminOrgRequests()
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all')
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  if (adminLoading) {
    return (
      <AppLayout>
        <div className="py-12 text-center text-gray-500">
          Checking permissions...
        </div>
      </AppLayout>
    )
  }

  if (!isSystemAdmin) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">System admin access required.</p>
          <Link href="/" className="text-indigo-600 hover:underline">
            Go home
          </Link>
        </div>
      </AppLayout>
    )
  }

  const filteredRequests = requests.filter(r =>
    statusFilter === 'all' ? true : r.status === statusFilter
  )

  const handleApprove = async (requestId: string) => {
    setFeedback(null)
    const result = await approveRequest(requestId)
    if (!result.success) {
      setFeedback({
        type: 'error',
        message: result.error || 'Failed to approve request',
      })
    } else {
      setFeedback({
        type: 'success',
        message: 'Organization approved and created successfully!',
      })
      setSelectedRequest(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please provide a reason for rejection',
      })
      return
    }

    setFeedback(null)
    const result = await rejectRequest(requestId, rejectionReason)
    if (!result.success) {
      setFeedback({
        type: 'error',
        message: result.error || 'Failed to reject request',
      })
    } else {
      setFeedback({
        type: 'success',
        message: 'Organization request rejected.',
      })
      setSelectedRequest(null)
      setRejectionReason('')
    }
  }

  const selectedRequestData = selectedRequest
    ? requests.find(r => r.id === selectedRequest)
    : null

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Organization Requests
          </h1>
          <Link href="/admin" className="text-indigo-600 hover:underline">
            Admin Home
          </Link>
        </div>

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

        {/* Status Filter */}
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} (
              {
                requests.filter(r => status === 'all' || r.status === status)
                  .length
              }
              )
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-8 text-gray-500">Loading requests...</div>
        )}

        {!loading && filteredRequests.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
            No organization requests found.
          </div>
        )}

        {!loading && filteredRequests.length > 0 && (
          <div className="space-y-4">
            {filteredRequests.map(request => (
              <div key={request.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {request.org_name}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          request.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      /{request.org_slug}
                    </p>
                    {request.org_description && (
                      <p className="mt-3 text-gray-700">
                        {request.org_description}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>
                        <strong>Submitted:</strong>{' '}
                        {new Date(request.requested_at).toLocaleString()}
                      </span>
                      <span>
                        <strong>User:</strong> {request.user_email}
                      </span>
                      {request.reviewed_at && (
                        <span>
                          <strong>Reviewed:</strong>{' '}
                          {new Date(request.reviewed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {request.rejection_reason && (
                      <div className="mt-3 rounded-md bg-red-50 p-3">
                        <p className="text-sm font-medium text-red-900">
                          Rejection Reason: {request.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setSelectedRequest(request.id)}
                          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          disabled={actionLoading}
                        >
                          Review
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Request Review Modal */}
        {selectedRequestData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Review Organization Request
                </h3>
                <button
                  onClick={() => {
                    setSelectedRequest(null)
                    setRejectionReason('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Organization:
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedRequestData.org_name}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">URL Slug:</p>
                  <p className="font-mono text-sm text-gray-900">
                    /{selectedRequestData.org_slug}
                  </p>
                </div>

                {selectedRequestData.org_description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Description:
                    </p>
                    <p className="text-gray-700">
                      {selectedRequestData.org_description}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Submitted by:
                  </p>
                  <p className="text-gray-900">
                    {selectedRequestData.user_email}
                  </p>
                  {selectedRequestData.user_name && (
                    <p className="text-sm text-gray-600">
                      {selectedRequestData.user_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Rejection Reason (if rejecting):
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Explain why this request is being rejected..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedRequestData.id)}
                    className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequestData.id)}
                    className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function OrgRequestsPage() {
  return <OrgRequestContent />
}
