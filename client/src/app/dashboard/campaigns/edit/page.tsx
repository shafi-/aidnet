'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useOrganization } from '@/hooks/useOrganization'
import { campaignService } from '@/services/CampaignService'
import { CampaignForm } from '@/components/campaign/CampaignForm'
import { AppLayout } from '@/components/layout/AppLayout'
import { isUuid } from '@/hooks/useQueryParam'
import type { Campaign } from '@/types'

function EditCampaignContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { currentOrg } = useOrganization()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !isUuid(id)) {
      setError('Invalid campaign id')
      setLoading(false)
      return
    }
    campaignService.getCampaign(id).then(({ data, error: err }) => {
      if (err) {
        setError(err)
        setCampaign(null)
      } else if (!data) {
        setError('Campaign not found')
        setCampaign(null)
      } else {
        setCampaign(data)
        setError(null)
      }
      setLoading(false)
    })
  }, [id])

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
          <Link href="/dashboard/campaigns" className="text-indigo-600 hover:underline">
            ← Back
          </Link>
        </div>

        {loading && <div className="text-gray-500 py-8">Loading...</div>}
        {error && <div className="text-red-600 py-8">{error}</div>}

        {!loading && !error && campaign && currentOrg && (
          <div className="bg-white rounded-lg shadow p-6">
            <CampaignForm
              orgId={currentOrg.id}
              mode="edit"
              campaignId={campaign.id}
              initial={campaign}
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function EditCampaignPage() {
  return (
    <Suspense fallback={<AppLayout><div className="text-center py-12 text-gray-500">Loading...</div></AppLayout>}>
      <EditCampaignContent />
    </Suspense>
  )
}
