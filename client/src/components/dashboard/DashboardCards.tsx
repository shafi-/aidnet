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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">My Organizations</h2>
        {organizations.length === 0 ? (
          <p className="text-gray-500 text-sm mb-4">No organizations yet.</p>
        ) : (
          <div className="space-y-2">
            {organizations.map((org) => (
              <div
                key={org.id}
                className={`p-2 rounded border ${currentOrg?.id === org.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <p className="font-medium text-sm">{org.name}</p>
                <p className="text-xs text-gray-500">{org.member_count} members</p>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/orgs"
          className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm"
        >
          Manage Organizations →
        </Link>
      </div>

      {/* Profile Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm"
        >
          Update Profile →
        </Link>
      </div>

      {/* Security */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Security</h2>
        <p className="text-sm text-gray-500 mb-4">Manage your account security settings</p>
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
