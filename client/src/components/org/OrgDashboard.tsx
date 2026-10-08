'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import { useSubscription } from '@/hooks/useSubscription'
import { BillingTab } from '@/components/subscription/BillingTab'
import { MembersTab } from '@/components/org/MembersTab'
import { SettingsTab } from '@/components/org/SettingsTab'
import { DonationsTab } from '@/components/org/DonationsTab'

export function OrgDashboard() {
  const { t } = useTranslation()
  const { currentOrg } = useOrganization()
  const { isOrgAdmin, isOrgOwner } = usePermissions()
  const { hasFeature } = useSubscription(currentOrg?.id ?? '')
  const [tab, setTab] = useState<
    'members' | 'settings' | 'billing' | 'donations'
  >('members')

  if (!currentOrg) return null

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{currentOrg.name}</h1>
          <p className="text-gray-600">
            {currentOrg.description ?? t('org.noDescription')}
          </p>
        </div>
      </div>
      <div className="mb-4 flex gap-4 border-b">
        {hasFeature('members') && (
          <button
            onClick={() => setTab('members')}
            className={`pb-2 ${tab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            {t('orgTabs.members')}
          </button>
        )}
        {hasFeature('settings') && isOrgAdmin() && (
          <button
            onClick={() => setTab('settings')}
            className={`pb-2 ${tab === 'settings' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            {t('orgTabs.settings')}
          </button>
        )}
        {isOrgAdmin() && (
          <button
            onClick={() => setTab('donations')}
            className={`pb-2 ${tab === 'donations' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            {t('orgTabs.donations')}
          </button>
        )}
        {isOrgOwner() && (
          <button
            onClick={() => setTab('billing')}
            className={`pb-2 ${tab === 'billing' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            {t('orgTabs.billing')}
          </button>
        )}
      </div>
      {tab === 'members' && hasFeature('members') && (
        <MembersTab orgId={currentOrg.id} />
      )}
      {tab === 'settings' && hasFeature('settings') && (
        <SettingsTab orgId={currentOrg.id} />
      )}
      {tab === 'donations' && isOrgAdmin() && (
        <DonationsTab orgId={currentOrg.id} />
      )}
      {tab === 'billing' && isOrgOwner() && (
        <BillingTab orgId={currentOrg.id} isOwner={isOrgOwner()} />
      )}
    </div>
  )
}
