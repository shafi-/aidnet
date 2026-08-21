'use client'

import { useRequireAuth, useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { OrgDashboard } from '@/components/org/OrgDashboard'
import { DashboardCards } from '@/components/dashboard/DashboardCards'
import { QuickStats } from '@/components/dashboard/QuickStats'
import Link from 'next/link'

export default function DashboardPage() {
  useRequireAuth()
  const { user } = useAuth()
  const { currentOrg } = useOrganization()

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {user && <p className="text-gray-600">Welcome back, {user.email}!</p>}
      </div>
      <QuickStats />
      <DashboardCards />
      {currentOrg && <OrgDashboard />}
    </div>
  )
}