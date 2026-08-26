'use client'

import { useState } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import { useSubscription } from '@/hooks/useSubscription'
import { BillingTab } from '@/components/subscription/BillingTab'
import { TodosTab } from '@/components/org/TodosTab'
import { MembersTab } from '@/components/org/MembersTab'
import { SettingsTab } from '@/components/org/SettingsTab'

export function OrgDashboard() {
  const { currentOrg } = useOrganization()
  const { isOrgAdmin, isOrgOwner } = usePermissions()
  const { hasFeature } = useSubscription(currentOrg?.id ?? '')
  const [tab, setTab] = useState<'todos' | 'members' | 'settings' | 'billing'>(
    'todos'
  )

  if (!currentOrg) return null

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{currentOrg.name}</h1>
          <p className="text-gray-600">
            {currentOrg.description ?? 'No description'}
          </p>
        </div>
      </div>
      <div className="mb-4 flex gap-4 border-b">
        {hasFeature('todos') && (
          <button
            onClick={() => setTab('todos')}
            className={`pb-2 ${tab === 'todos' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Todos
          </button>
        )}
        {hasFeature('members') && (
          <button
            onClick={() => setTab('members')}
            className={`pb-2 ${tab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Members
          </button>
        )}
        {hasFeature('settings') && isOrgAdmin() && (
          <button
            onClick={() => setTab('settings')}
            className={`pb-2 ${tab === 'settings' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Settings
          </button>
        )}
        {isOrgOwner() && (
          <button
            onClick={() => setTab('billing')}
            className={`pb-2 ${tab === 'billing' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Billing
          </button>
        )}
      </div>
      {tab === 'todos' && hasFeature('todos') && (
        <TodosTab orgId={currentOrg.id} />
      )}
      {tab === 'members' && hasFeature('members') && (
        <MembersTab orgId={currentOrg.id} />
      )}
      {tab === 'settings' && hasFeature('settings') && (
        <SettingsTab orgId={currentOrg.id} />
      )}
      {tab === 'billing' && isOrgOwner() && (
        <BillingTab orgId={currentOrg.id} isOwner={isOrgOwner()} />
      )}
    </div>
  )
}
