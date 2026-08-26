'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRequireAuth, useAuth } from '@/hooks/useAuth'
import { useOrgRequests } from '@/hooks/useOrgRequests'
import { AppLayout } from '@/components/layout/AppLayout'

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function OrgRequestPage() {
  useRequireAuth()
  const { user } = useAuth()
  const { requests, loading, submitRequest } = useOrgRequests()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const pendingRequest = requests.find(r => r.status === 'pending')
  const approvedRequest = requests.find(r => r.status === 'approved')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!name.trim() || !slug.trim()) {
      setError('Organization name and slug are required')
      return
    }

    setSubmitting(true)
    const result = await submitRequest(
      name.trim(),
      slug.trim(),
      description.trim() || undefined
    )
    setSubmitting(false)

    if (!result.success) {
      setError(result.error || 'Failed to submit organization request')
    } else {
      setSuccess('Organization request submitted successfully!')
      setName('')
      setSlug('')
      setDescription('')
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="py-12 text-center">Loading...</div>
      </AppLayout>
    )
  }

  // Show approved org with redirect to dashboard
  if (approvedRequest) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
          <div className="rounded-lg bg-green-50 p-8 text-center">
            <h1 className="text-2xl font-bold text-green-900">
              Organization Approved!
            </h1>
            <p className="mt-2 text-green-700">
              Your organization &ldquo;{approvedRequest.org_name}&rdquo; has
              been approved.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-md bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Show pending request status
  if (pendingRequest) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
          <div className="rounded-lg bg-yellow-50 p-8 text-center">
            <h1 className="text-2xl font-bold text-yellow-900">
              Request Pending Review
            </h1>
            <p className="mt-2 text-yellow-700">
              Your organization request is currently being reviewed by our
              administrators.
            </p>
            <div className="mt-6 rounded-md bg-yellow-100 p-4 text-left">
              <p className="text-sm font-medium text-yellow-900">
                Organization Name: {pendingRequest.org_name}
              </p>
              <p className="text-sm text-yellow-800">
                Submitted:{' '}
                {new Date(pendingRequest.requested_at).toLocaleString()}
              </p>
            </div>
            <p className="mt-4 text-sm text-yellow-600">
              You will be able to access the dashboard once your request is
              approved.
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Organization
          </h1>
          <p className="mt-2 text-gray-600">
            Submit your organization for review and approval
          </p>
        </div>

        {success && (
          <div className="rounded-md bg-green-50 p-4 text-green-800">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-red-800">{error}</div>
        )}

        <div className="rounded-lg bg-white p-8 shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="orgName"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Organization Name
              </label>
              <input
                id="orgName"
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value)
                  setSlug(slugify(e.target.value))
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="My Organization"
                required
              />
            </div>

            <div>
              <label
                htmlFor="orgSlug"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                URL Slug
              </label>
              <input
                id="orgSlug"
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="my-organization"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Tell us about your organization..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-indigo-600 px-4 py-3 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
