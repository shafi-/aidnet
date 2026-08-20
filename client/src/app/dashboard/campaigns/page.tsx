'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useOrganization } from '@/hooks/useOrganization'
import { useCampaigns } from '@/hooks/useCampaigns'
import { usePermissions } from '@/hooks/usePermissions'
import { AppLayout } from '@/components/layout/AppLayout'

function DashboardCampaignsContent() {
  const { currentOrg } = useOrganization()
  const { hasPermission } = usePermissions()
  const { campaigns, loading, error, submit, remove } = useCampaigns(currentOrg?.id)

  if (!currentOrg) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-gray-600">Select an organization to manage campaigns.</p>
          <Link href="/orgs" className="text-indigo-600 hover:underline">Go to Organizations</Link>
        </div>
      </AppLayout>
    )
  }

  const canCreate = hasPermission('campaigns:create')

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-500">{currentOrg.name}</p>
          </div>
          {canCreate && (
            <Link
              href="/dashboard/campaigns/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium"
            >
              New Campaign
            </Link>
          )}
        </div>

        {loading && <div className="text-gray-500 py-8">Loading...</div>}
        {error && <div className="text-red-600 py-8">{error}</div>}

        {!loading && !error && campaigns.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No campaigns yet.{' '}
            {canCreate && (
              <Link href="/dashboard/campaigns/new" className="text-indigo-600 hover:underline">
                Create your first campaign
              </Link>
            )}
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="bg-white rounded-lg shadow divide-y">
            {campaigns.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{c.title}</span>
                    <StatusBadge status={c.status} />
                    {c.is_zakat_eligible && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        Zakat
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">/{c.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === 'draft' || c.status === 'rejected' ? (
                    <button
                      onClick={() => submit(c.id)}
                      className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
                    >
                      Submit for Review
                    </button>
                  ) : null}
                  <Link
                    href={`/dashboard/campaigns/edit?id=${c.id}`}
                    className="text-sm text-gray-700 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50"
                  >
                    Edit
                  </Link>
                  {hasPermission('campaigns:delete') && c.status !== 'live' && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete campaign "${c.title}"?`)) remove(c.id)
                      }}
                      className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_review: 'bg-yellow-100 text-yellow-800',
    live: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    closed: 'bg-gray-200 text-gray-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[status ?? 'draft'] ?? map.draft}`}>
      {status ?? 'draft'}
    </span>
  )
}

export default function DashboardCampaignsPage() {
  return (
    <Suspense fallback={<AppLayout><div className="text-center py-12 text-gray-500">Loading...</div></AppLayout>}>
      <DashboardCampaignsContent />
    </Suspense>
  )
}
