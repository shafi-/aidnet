'use client'

import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { profileService } from '@/services/ProfileService'
import { supabaseManager } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import type { UserProfile } from '@/types'

export function ProfileComponent() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const [_profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Only fetch once the auth session is restored — firing earlier sends an
    // anonymous request that legitimately returns no rows, leaving the form
    // permanently blank.
    if (!user) return
    async function load() {
      // Ensure the client has hydrated the persisted session before sending
      // credentials — otherwise the RPC races the restore and returns empty.
      await supabaseManager.getSession()
      let { data } = await profileService.getMyProfile()
      // A signed-in user always has a profile row; an empty result means the
      // request raced page bootstrap and got dropped — retry once.
      if (!data) {
        await new Promise(resolve => setTimeout(resolve, 400))
        const retry = await profileService.getMyProfile()
        data = retry.data
      }
      if (data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
      }
      setLoading(false)
    }
    load()
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    await profileService.updateMyProfile({ full_name: fullName })
    const { data } = await profileService.getMyProfile()
    if (data) setProfile(data)
    setSaving(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <p className="mt-1 text-gray-900">{user?.email}</p>
        </div>
        <div>
          <label
            htmlFor="full-name"
            className="block text-sm font-medium text-gray-700"
          >
            Full Name
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Organization
          </label>
          <p className="mt-1 text-gray-900">{currentOrg?.name ?? 'None'}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
