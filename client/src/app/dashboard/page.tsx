'use client'

import { useRequireAuth, useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { OrgDashboard } from '@/components/org/OrgDashboard'
import { DashboardCards } from '@/components/dashboard/DashboardCards'
import { QuickStats } from '@/components/dashboard/QuickStats'
import { AppLayout } from '@/components/layout/AppLayout'
import { useProfile } from '@/hooks/useProfile'
import { usePageTitle } from '@/hooks/usePageTitle'
import Link from 'next/link'

export default function DashboardPage() {
  useRequireAuth()
  const { user } = useAuth()
  const { currentOrg, organizations } = useOrganization()
  const { fullName } = useProfile()
  usePageTitle('Dashboard')

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {user && (
            <p className="text-gray-600">
              Welcome back{fullName ? `, ${fullName}` : ''}!
            </p>
          )}
        </div>

        {/* No org at all: onboarding, not a warning */}
        {!currentOrg && organizations.length === 0 && (
          <div className="rounded-lg border border-indigo-100 bg-white p-6 shadow">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Get started on Donate
            </h2>
            <p className="mb-4 text-gray-600">
              You are not part of an organization yet. Discover live campaigns
              you can support, or request an organization to start raising
              funds.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/campaigns"
                className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Browse Campaigns
              </Link>
              <Link
                href="/org/request"
                className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:border-indigo-400 hover:text-indigo-600"
              >
                Request an Organization
              </Link>
            </div>
          </div>
        )}

        {/* Has orgs but none selected */}
        {!currentOrg && organizations.length > 0 && (
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
