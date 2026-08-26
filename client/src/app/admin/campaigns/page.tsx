'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCampaignAdmin } from '@/hooks/useCampaignAdmin'
import { AppLayout } from '@/components/layout/AppLayout'
import type { Campaign } from '@/types'

function AdminCampaignsContent() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug')
  const { pending, loading, actionLoading, error, verify, reject } =
    useCampaignAdmin()
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

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

  const selected: Campaign | undefined = slug
    ? pending.find(c => c.slug === slug)
    : undefined

  const handleVerify = async (id: string) => {
    setFeedback(null)
    const { error: err } = await verify(id, notes || undefined)
    setFeedback(err ? `Error: ${err}` : 'Campaign verified and published.')
    setNotes('')
  }

  const handleReject = async (id: string) => {
    setFeedback(null)
    const { error: err } = await reject(id, notes || undefined)
    setFeedback(err ? `Error: ${err}` : 'Campaign rejected.')
    setNotes('')
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Campaign Review Queue
          </h1>
          <Link href="/admin" className="text-indigo-600 hover:underline">
            Admin Home
          </Link>
        </div>

        {loading && (
          <div className="py-8 text-gray-500">Loading pending campaigns...</div>
        )}
        {error && <div className="py-8 text-red-600">{error}</div>}
        {feedback && (
          <div className="rounded-md bg-blue-50 p-3 text-blue-800">
            {feedback}
          </div>
        )}

        {!loading && !selected && (
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
                No campaigns pending review.
              </div>
            ) : (
              pending.map(c => (
                <Link
                  key={c.id}
                  href={`/admin/campaigns?slug=${encodeURIComponent(c.slug)}`}
                  className="block rounded-lg bg-white p-4 shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{c.title}</span>
                    <span className="text-sm text-gray-500">/{c.slug}</span>
                  </div>
                  {c.is_zakat_eligible && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      Zakat
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {selected && (
          <div className="space-y-4 rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {selected.title}
              </h2>
              <Link
                href="/admin/campaigns"
                className="text-sm text-indigo-600 hover:underline"
              >
                ← Back to queue
              </Link>
            </div>
            <p className="text-sm text-gray-500">/{selected.slug}</p>
            {selected.description && (
              <p className="whitespace-pre-line text-gray-700">
                {selected.description}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              {selected.goal_amount != null && (
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  Goal: {selected.goal_amount.toLocaleString()}{' '}
                  {selected.currency}
                </span>
              )}
              {selected.is_zakat_eligible && (
                <span className="rounded-md bg-green-100 px-3 py-1 text-green-800">
                  Zakat
                </span>
              )}
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">
                Verification Notes
              </span>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes for the organization"
              />
            </label>

            <div className="flex gap-3">
              <button
                disabled={actionLoading}
                onClick={() => handleVerify(selected.id)}
                className="rounded-md bg-green-600 px-5 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Verify & Publish
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleReject(selected.id)}
                className="rounded-md bg-red-600 px-5 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function AdminCampaignsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="py-12 text-center text-gray-500">Loading...</div>
        </AppLayout>
      }
    >
      <AdminCampaignsContent />
    </Suspense>
  )
}
