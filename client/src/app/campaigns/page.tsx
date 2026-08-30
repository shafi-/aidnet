'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePublicCampaigns } from '@/hooks/usePublicCampaigns'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { isUuid } from '@/hooks/useQueryParam'
import { usePageTitle } from '@/hooks/usePageTitle'

function CampaignsContent() {
  const searchParams = useSearchParams()
  const zakatParam = searchParams.get('zakat')
  const orgParam = searchParams.get('org')

  const zakat = zakatParam === 'true'
  const org = orgParam && isUuid(orgParam) ? orgParam : null

  usePageTitle('Discover Campaigns')
  const { campaigns, loading, error } = usePublicCampaigns({ zakat, org })

  const buildHref = (nextZakat: boolean) => {
    const params = new URLSearchParams()
    if (nextZakat) params.set('zakat', 'true')
    if (org) params.set('org', org)
    const qs = params.toString()
    return qs ? `/campaigns?${qs}` : '/campaigns'
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Discover Campaigns
          </h1>
          <Link
            href="/"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Home
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={buildHref(!zakat)}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              zakat
                ? 'bg-green-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700'
            }`}
          >
            {zakat ? '✓ Zakat Eligible' : 'All Campaigns'}
          </Link>
          {zakat && (
            <Link
              href="/campaigns"
              className="text-sm text-gray-500 hover:underline"
            >
              Clear filter
            </Link>
          )}
        </div>

        {loading && (
          <div
            className="py-12 text-center text-gray-500"
            role="status"
            aria-live="polite"
          >
            Loading campaigns...
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-red-600" role="alert">
            Failed to load campaigns: {error}
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className="space-y-3 py-12 text-center text-gray-500">
            <p>
              {zakat
                ? 'No zakat-eligible campaigns found.'
                : org
                  ? 'No campaigns found for this organization.'
                  : 'No campaigns found yet.'}
            </p>
            {(zakat || org) && (
              <Link
                href="/campaigns"
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                Clear filters
              </Link>
            )}
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="py-12 text-center text-gray-500">Loading...</div>
        </AppLayout>
      }
    >
      <CampaignsContent />
    </Suspense>
  )
}
