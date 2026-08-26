'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { profileService } from '@/services/ProfileService'
import { supabaseManager } from '@/lib/supabase'
import type { UserProfile } from '@/types'

export function useProfile() {
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

  const save = async () => {
    setSaving(true)
    await profileService.updateMyProfile({ full_name: fullName })
    const { data } = await profileService.getMyProfile()
    if (data) setProfile(data)
    setSaving(false)
  }

  return {
    email: user?.email ?? '',
    fullName,
    setFullName,
    orgName: currentOrg?.name ?? null,
    loading,
    saving,
    save,
  }
}

export type ProfileController = ReturnType<typeof useProfile>
