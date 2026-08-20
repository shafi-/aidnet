'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useOrganization } from '@/hooks/useOrganization'
import { CampaignForm } from '@/components/campaign/CampaignForm'
import { AppLayout } from '@/components/layout/AppLayout'

function NewCampaignContent() {
  const { currentOrg } = useOrganization()

  if (!currentOrg) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <p className="text-gray-600">Select an organization before creating a campaign.</p>
          <Link href="/orgs" className="text-indigo-600 hover:underline">Go to Organizations</Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">New Campaign</h1>
          <Link href="/dashboard/campaigns" className="text-indigo-600 hover:underline">
            ← Back
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <CampaignForm orgId={currentOrg.id} mode="create" />
        </div>
      </div>
    </AppLayout>
  )
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<AppLayout><div className="text-center py-12 text-gray-500">Loading...</div></AppLayout>}>
      <NewCampaignContent />
    </Suspense>
  )
}
