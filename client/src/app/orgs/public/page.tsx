'use client'

import { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useRequiredParam } from '@/hooks/useQueryParam'
import { usePublicOrg } from '@/hooks/usePublicOrg'
import { usePublicCampaigns } from '@/hooks/usePublicCampaigns'
import { useAuth } from '@/hooks/useAuth'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import Link from 'next/link'

function OrgCampaignsSection({
  orgId,
  orgName,
}: {
  orgId: string
  orgName: string
}) {
  const { campaigns, loading, error } = usePublicCampaigns({
    org: orgId,
    limit: 6,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Campaigns by {orgName}
        </h2>
        <Link
          href={`/campaigns?org=${encodeURIComponent(orgId)}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          See all →
        </Link>
      </div>

      {loading && (
        <div className="py-6 text-center text-gray-500">
          Loading campaigns...
        </div>
      )}

      {error && <div className="py-6 text-center text-red-600">{error}</div>}

      {!loading && !error && campaigns.length === 0 && (
        <p className="text-gray-500">No live campaigns yet.</p>
      )}

      {!loading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map(c => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function PublicOrgContent() {
  const slug = useRequiredParam('slug')
  const { org, loading, error } = usePublicOrg(slug)
  const { user } = useAuth()

  const createdAt = org?.created_at
    ? new Date(org.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-8">
        {loading && (
          <div className="py-12 text-center" role="status" aria-live="polite">
            <div className="text-gray-500">Loading organization...</div>
          </div>
        )}

        {error && (
          <div className="space-y-4 py-12 text-center" role="alert">
            <h1 className="text-2xl font-bold text-gray-900">
              Organization Not Found
            </h1>
            <p className="text-gray-600">{error}</p>
            <Link href="/" className="text-indigo-600 hover:underline">
              Go home
            </Link>
          </div>
        )}

        {org && (
          <div className="space-y-8">
            <div className="space-y-4 text-center">
              <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
              {org.description && (
                <p className="mx-auto max-w-xl text-lg text-gray-600">
                  {org.description}
                </p>
              )}
            </div>

            <div className="space-y-4 rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Created</span>
                  <p className="font-medium">{createdAt}</p>
                </div>
              </div>
            </div>

            <OrgCampaignsSection orgId={org.id} orgName={org.name} />

            <div className="flex justify-center gap-4">
              {user ? (
                <>
                  <Link
                    href={`/campaigns?org=${encodeURIComponent(org.id)}`}
                    className="rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
                  >
                    Browse campaigns
                  </Link>
                  <Link
                    href="/dashboard"
                    className="rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900 hover:bg-gray-50"
                  >
                    Go to dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900 hover:bg-gray-50"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function PublicOrgPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="py-12 text-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        </AppLayout>
      }
    >
      <PublicOrgContent />
    </Suspense>
  )
}
