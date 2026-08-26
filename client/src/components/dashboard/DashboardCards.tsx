'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'

export function DashboardCards() {
  const { user } = useAuth()
  const { organizations, currentOrg } = useOrganization()

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* My Organizations */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">My Organizations</h2>
        {organizations.length === 0 ? (
          <p className="mb-4 text-sm text-gray-500">No organizations yet.</p>
        ) : (
          <div className="space-y-2">
            {organizations.map(org => (
              <div
                key={org.id}
                className={`rounded border p-2 ${currentOrg?.id === org.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <p className="text-sm font-medium">{org.name}</p>
                <p className="text-xs text-gray-500">
                  {org.member_count} members
                </p>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/orgs"
          className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          Manage Organizations →
        </Link>
      </div>

      {/* Profile Settings */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Profile Settings</h2>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          Update Profile →
        </Link>
      </div>

      {/* Security */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Security</h2>
        <p className="mb-4 text-sm text-gray-500">
          Manage your account security settings
        </p>
        <div className="space-y-2">
          <Link
            href="/auth/reset-password/"
            className="block text-sm text-blue-600 hover:text-blue-700"
          >
            Change Password
          </Link>
        </div>
      </div>
    </div>
  )
}
