'use client'

import { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useRequiredParam } from '@/hooks/useQueryParam'
import { usePublicOrg } from '@/hooks/usePublicOrg'
import Link from 'next/link'

function PublicOrgContent() {
  const slug = useRequiredParam('slug')
  const { org, loading, error } = usePublicOrg(slug)

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-8">
        {loading && (
          <div className="py-12 text-center">
            <div className="text-gray-500">Loading organization...</div>
          </div>
        )}

        {error && (
          <div className="space-y-4 py-12 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Organization Not Found
            </h1>
            <p className="text-gray-600">{error}</p>
            <Link href="/" className="text-blue-600 hover:underline">
              Go home
            </Link>
          </div>
        )}

        {org && (
          <div className="space-y-8">
            <div className="space-y-4 text-center">
              <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
              {org.description && (
                <p className="mx-auto max-w-xl text-lg text-gray-600">
                  {org.description}
                </p>
              )}
            </div>

            <div className="space-y-4 rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Created</span>
                  <p className="font-medium">
                    {new Date(org.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Slug</span>
                  <p className="font-mono font-medium">{org.slug}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Link
                href="/auth/login"
                className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900 hover:bg-gray-50"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function PublicOrgPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="py-12 text-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        </AppLayout>
      }
    >
      <PublicOrgContent />
    </Suspense>
  )
}
