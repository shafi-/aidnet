'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePublicCampaigns } from '@/hooks/usePublicCampaigns'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { isUuid } from '@/hooks/useQueryParam'

function CampaignsContent() {
  const searchParams = useSearchParams()
  const zakatParam = searchParams.get('zakat')
  const orgParam = searchParams.get('org')

  const zakat = zakatParam === 'true'
  const org = orgParam && isUuid(orgParam) ? orgParam : null

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Discover Campaigns</h1>
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
            ← Home
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={buildHref(!zakat)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              zakat
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            {zakat ? '✓ Zakat Eligible' : 'All Campaigns'}
          </Link>
          {zakat && (
            <Link href="/campaigns" className="text-sm text-gray-500 hover:underline">
              Clear filter
            </Link>
          )}
        </div>

        {loading && <div className="text-center text-gray-500 py-12">Loading campaigns...</div>}

        {error && (
          <div className="text-center text-red-600 py-12">Failed to load campaigns: {error}</div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className="text-center text-gray-500 py-12">No campaigns found.</div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {campaigns.map((c) => (
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
    <Suspense fallback={<AppLayout><div className="text-center py-12 text-gray-500">Loading...</div></AppLayout>}>
      <CampaignsContent />
    </Suspense>
  )
}
