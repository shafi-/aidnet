'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useRequiredParam } from '@/hooks/useQueryParam'
import { useEffect } from 'react'
import Link from 'next/link'

export default function OrgsPage() {
  useRequireAuth()
  const orgId = useRequiredParam('id')
  const { selectOrgById } = useOrganization()

  // Handle initial selection from ?id= (e.g., invite links). The hook only
  // persists and applies verified, non-suspended organizations; anything else
  // forces (or keeps) the selector visible.
  useEffect(() => {
    if (!orgId) return
    selectOrgById(orgId).then(() => {
      // Redirect to clean URL after the selection attempt
      window.history.replaceState({}, '', '/orgs')
    })
  }, [orgId, selectOrgById])

  // Render the org list (provider handles blocking when multiple orgs & none selected)
  return (
    <AppLayout>
      <div className="space-y-6">
        <OrgList />
      </div>
    </AppLayout>
  )
}

function OrgList() {
  const { organizations, loading } = useOrganization()

  if (loading) return <div>Loading...</div>

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <Link
          href="/org/request"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Request Organization
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map(org => (
          <div
            key={org.id}
            className={`rounded-lg bg-white p-6 shadow ${
              org.status === 'active'
                ? 'transition-shadow hover:shadow-md'
                : 'bg-gray-50 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {org.status === 'active' ? (
                  <Link href={`/orgs?id=${org.id}`} className="block">
                    <h2 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                      {org.name}
                    </h2>
                  </Link>
                ) : (
                  <h2 className="text-lg font-semibold text-gray-500">
                    {org.name}
                  </h2>
                )}
                <p className="mt-1 text-sm text-gray-600">
                  {org.description ?? 'No description'}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Your role: {org.user_role}
                </p>
              </div>
              {org.status === 'suspended' && (
                <span className="ml-4 shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                  Suspended
                </span>
              )}
            </div>
          </div>
        ))}
        {organizations.length === 0 && (
          <div className="col-span-full py-8 text-center">
            <p className="mb-4 text-gray-500">
              No organizations yet. Submit an organization request to get
              started.
            </p>
            <Link
              href="/org/request"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Request Organization
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
