'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useRequiredParam } from '@/hooks/useQueryParam'
import { organizationService } from '@/services/OrganizationService'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function OrgsPage() {
  useRequireAuth()
  const orgId = useRequiredParam('id')
  const { setCurrentOrg } = useOrganization()

  // Handle initial selection from ?id= (e.g., invite links)
  useEffect(() => {
    if (!orgId) return
    // Persist the selection synchronously so a reload mid-fetch still keeps it.
    try {
      localStorage.setItem('supanext.currentOrgId', orgId)
    } catch {
      // Ignore storage access errors
    }
    organizationService.getOrganization(orgId).then(({ data }) => {
      if (data) {
        setCurrentOrg(data)
        // Redirect to clean URL after selection
        window.history.replaceState({}, '', '/orgs')
      }
    })
  }, [orgId, setCurrentOrg])

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
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const { setCurrentOrg } = useOrganization()
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const { data, error } = await organizationService.createOrganization(
      name.trim(),
      slug.trim(),
      description.trim() || undefined,
    )
    setCreating(false)
    if (error) {
      alert(error)
      return
    }
    if (data) {
      setCurrentOrg(data as any)
      router.push('/dashboard')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'Create Organization'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Organization</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (for public URL)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full border rounded-md px-3 py-2 font-mono"
                pattern="[a-z0-9-]+"
                placeholder="my-org"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-gray-600 px-4 py-2 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Link key={org.id} href={`/orgs?id=${org.id}`} className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-lg">{org.name}</h2>
            <p className="text-gray-600 text-sm mt-1">{org.description ?? 'No description'}</p>
            <p className="text-gray-500 text-xs mt-2">{org.member_count} members</p>
          </Link>
        ))}
        {organizations.length === 0 && !showCreateForm && (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500 mb-4">No organizations yet. Create your first organization to get started.</p>
          </div>
        )}
      </div>
    </>
  )
}
