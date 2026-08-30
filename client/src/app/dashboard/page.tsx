'use client'

import { useRequireAuth, useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { OrgDashboard } from '@/components/org/OrgDashboard'
import { DashboardCards } from '@/components/dashboard/DashboardCards'
import { QuickStats } from '@/components/dashboard/QuickStats'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'

export default function DashboardPage() {
  useRequireAuth()
  const { user } = useAuth()
  const { currentOrg } = useOrganization()

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {user && <p className="text-gray-600">Welcome back, {user.email}!</p>}
        </div>

        {/* Security: Show message if no active org is selected */}
        {!currentOrg && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
            <h2 className="mb-2 text-lg font-semibold text-yellow-900">
              No Active Organization Selected
            </h2>
            <p className="mb-4 text-yellow-800">
              Please select an active organization to continue.
            </p>
            <Link
              href="/orgs"
              className="inline-block rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
            >
              Select Organization
            </Link>
          </div>
        )}

        {/* Security: Show suspension message if current org is suspended */}
        {currentOrg && currentOrg.status === 'suspended' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 text-lg font-semibold text-red-900">
              Organization Suspended
            </h2>
            <p className="mb-4 text-red-800">
              Your organization <strong>{currentOrg.name}</strong> has been
              suspended. You have read-only access to organization information.
            </p>
            <p className="text-sm text-red-700">
              Please contact your organization administrator or platform support
              for assistance.
            </p>
          </div>
        )}

        <QuickStats />
        <DashboardCards />
        {currentOrg && currentOrg.status === 'active' && <OrgDashboard />}
      </div>
    </AppLayout>
  )
}
