'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { CampaignForm } from '@/components/campaign/CampaignForm'
import { useCampaignForm } from '@/hooks/useCampaignForm'
import { AppLayout } from '@/components/layout/AppLayout'
import { OrgGate } from '@/components/org/OrgGate'
import { usePageTitle } from '@/hooks/usePageTitle'

function NewCampaignContent() {
  const { t } = useTranslation()
  const { currentOrg } = useOrganization()

  usePageTitle(t('campaignNew.title'))

  if (!currentOrg) {
    return (
      <AppLayout>
        <OrgGate>
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
            <p className="text-gray-600">{t('campaignNew.selectOrg')}</p>
            <Link href="/orgs" className="text-indigo-600 hover:underline">
              {t('dashboardCampaigns.goToOrgs')}
            </Link>
          </div>
        </OrgGate>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <OrgGate>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {t('campaignNew.title')}
            </h1>
            <Link
              href="/dashboard/campaigns"
              className="text-indigo-600 hover:underline"
            >
              {t('common.back')}
            </Link>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <NewCampaignForm orgId={currentOrg.id} />
          </div>
        </div>
      </OrgGate>
    </AppLayout>
  )
}

function NewCampaignForm({ orgId }: { orgId: string }) {
  const controller = useCampaignForm({ orgId, mode: 'create' })
  return <CampaignForm controller={controller} />
}

export default function NewCampaignPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="py-12 text-center text-gray-500">
            {t('common.loading')}
          </div>
        </AppLayout>
      }
    >
      <NewCampaignContent />
    </Suspense>
  )
}
