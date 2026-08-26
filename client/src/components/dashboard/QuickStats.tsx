'use client'

import { useOrganization } from '@/hooks/useOrganization'

export function QuickStats() {
  const { organizations, currentOrg } = useOrganization()

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold">Quick Stats</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {organizations.length}
          </p>
          <p className="text-sm text-gray-600">Organizations</p>
        </div>
        {currentOrg && (
          <>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {currentOrg.member_count}
              </p>
              <p className="text-sm text-gray-600">Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {(currentOrg as any).campaign_count || 0}
              </p>
              <p className="text-sm text-gray-600">Campaigns</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {(currentOrg as any).todo_count || 0}
              </p>
              <p className="text-sm text-gray-600">Active Tasks</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
