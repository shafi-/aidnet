'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useSystemAdminOrgRequests } from '@/hooks/useSystemAdminOrgRequests'
import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { usePageTitle } from '@/hooks/usePageTitle'

function OrgRequestContent() {
  const { t } = useTranslation()
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

  usePageTitle(t('admin.requestsTitle'))

  if (adminLoading) {
    return (
      <ConsoleShell variant="admin">
        <div className="py-12 text-center text-gray-500">
          {t('admin.checkingPermissions')}
        </div>
      </ConsoleShell>
    )
  }

  if (!isSystemAdmin) {
    return (
      <ConsoleShell variant="admin">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('errors.accessDenied')}
          </h1>
          <p className="text-gray-600">{t('errors.systemAdminRequired')}</p>
          <Link href="/" className="text-indigo-600 hover:underline">
            {t('common.goHome')}
          </Link>
        </div>
      </ConsoleShell>
    )
  }

  const filteredRequests = requests.filter(r =>
    statusFilter === 'all' ? true : r.status === statusFilter
  )

  const filterLabel = (status: 'all' | 'pending' | 'approved' | 'rejected') => {
    const count = requests.filter(
      r => status === 'all' || r.status === status
    ).length
    return t(
      `admin.filter${status.charAt(0).toUpperCase()}${status.slice(1)}`,
      {
        count,
      }
    )
  }

  const handleApprove = async (requestId: string) => {
    setFeedback(null)
    const result = await approveRequest(requestId)
    if (!result.success) {
      setFeedback({
        type: 'error',
        message: result.error || t('admin.approveFailed'),
      })
    } else {
      setFeedback({
        type: 'success',
        message: t('admin.approvedMsg'),
      })
      setSelectedRequest(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      setFeedback({
        type: 'error',
        message: t('admin.reasonRequired'),
      })
      return
    }

    setFeedback(null)
    const result = await rejectRequest(requestId, rejectionReason)
    if (!result.success) {
      setFeedback({
        type: 'error',
        message: result.error || t('admin.rejectFailed'),
      })
    } else {
      setFeedback({
        type: 'success',
        message: t('admin.requestRejectedMsg'),
      })
      setSelectedRequest(null)
      setRejectionReason('')
    }
  }

  const selectedRequestData = selectedRequest
    ? requests.find(r => r.id === selectedRequest)
    : null

  return (
    <ConsoleShell variant="admin">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('admin.requestsTitle')}
          </h1>
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
              {filterLabel(status)}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-8 text-gray-500">{t('admin.loadingRequests')}</div>
        )}

        {!loading && filteredRequests.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
            {t('admin.noRequests')}
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
                        {t(`status.${request.status}`, {
                          defaultValue: request.status,
                        })}
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
                        <strong>{t('admin.submittedLabel')}</strong>{' '}
                        {new Date(request.requested_at).toLocaleString()}
                      </span>
                      <span>
                        <strong>{t('admin.userLabel')}</strong>{' '}
                        {request.user_email}
                      </span>
                      {request.reviewed_at && (
                        <span>
                          <strong>{t('admin.reviewedLabel')}</strong>{' '}
                          {new Date(request.reviewed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {request.rejection_reason && (
                      <div className="mt-3 rounded-md bg-red-50 p-3">
                        <p className="text-sm font-medium text-red-900">
                          {t('admin.rejectionReason', {
                            reason: request.rejection_reason,
                          })}
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
                          {t('admin.review')}
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
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={t('admin.reviewModal')}
            onClick={e => {
              if (e.target === e.currentTarget) {
                setSelectedRequest(null)
                setRejectionReason('')
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setSelectedRequest(null)
                setRejectionReason('')
              }
            }}
            tabIndex={-1}
          >
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  {t('admin.reviewModal')}
                </h3>
                <button
                  onClick={() => {
                    setSelectedRequest(null)
                    setRejectionReason('')
                  }}
                  aria-label={t('common.closeDialog')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {t('admin.orgLabel')}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedRequestData.org_name}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {t('admin.urlSlugLabel')}
                  </p>
                  <p className="font-mono text-sm text-gray-900">
                    /{selectedRequestData.org_slug}
                  </p>
                </div>

                {selectedRequestData.org_description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t('common.descriptionLabel')}:
                    </p>
                    <p className="text-gray-700">
                      {selectedRequestData.org_description}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {t('admin.submittedBy')}
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
                    {t('admin.rejectionReasonLabel')}
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder={t('admin.rejectionPlaceholder')}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedRequestData.id)}
                    className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    {t('admin.approve')}
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequestData.id)}
                    className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    {t('admin.reject')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConsoleShell>
  )
}

export default function OrgRequestsPage() {
  return <OrgRequestContent />
}
