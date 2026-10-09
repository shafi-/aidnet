'use client'

import { useState, useEffect, useCallback } from 'react'
import { memberService } from '@/services/MemberService'
import { inviteService } from '@/services/InviteService'
import { usePermissions } from '@/hooks/usePermissions'
import type { Invite, MemberView } from '@/types'

export function useOrgMembers(orgId: string) {
  const { isOrgAdmin } = usePermissions()
  const [members, setMembers] = useState<MemberView[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // One shared draft: the add-member and invite forms historically bind the
  // same input state — preserved so switching sub-tabs keeps the text.
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  // The inviter is the delivery channel (no invite email is sent): keep the
  // invite just created so the panel can surface its code/link to share.
  const [lastInvite, setLastInvite] = useState<Invite | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [{ data: memberData, error: memberError }, { data: inviteData }] =
      await Promise.all([
        memberService.getMembers(orgId),
        isOrgAdmin()
          ? inviteService.getInvites(orgId)
          : Promise.resolve({ data: [] }),
      ])
    // Surface failures: an empty list is indistinguishable from a denied
    // request and reads as "broken" — show why instead.
    if (memberError) setError(memberError)
    if (memberData) setMembers(memberData)
    if (inviteData) setInvites(inviteData)
    setLoading(false)
  }, [orgId, isOrgAdmin])

  useEffect(() => {
    // A callout about the previous org's invite must not survive the switch.
    setLastInvite(null)
    load()
  }, [load])

  const addMember = useCallback(
    async (emailValue: string) => {
      const val = emailValue.trim()
      if (!val) return
      await memberService.addMember(orgId, val)
      setEmail('')
      await load()
    },
    [orgId, load]
  )

  const invite = useCallback(
    async (emailValue: string, role: string) => {
      const val = emailValue.trim()
      if (!val) return
      const { data } = await inviteService.generateInvite(orgId, val, role)
      setEmail('')
      await load()
      if (data) setLastInvite(data)
    },
    [orgId, load]
  )

  const updateRole = useCallback(
    async (userId: string, newRole: string) => {
      await memberService.updateMemberRole(orgId, userId, newRole)
      await load()
    },
    [orgId, load]
  )

  const removeMember = useCallback(
    async (userId: string) => {
      await memberService.removeMember(orgId, userId)
      await load()
    },
    [load, orgId]
  )

  const revokeInvite = useCallback(
    async (inviteId: string) => {
      await inviteService.revokeInvite(inviteId)
      await load()
    },
    [load]
  )

  const clearLastInvite = useCallback(() => setLastInvite(null), [])

  return {
    members,
    invites,
    loading,
    error,
    isAdmin: isOrgAdmin,
    email,
    setEmail,
    inviteRole,
    setInviteRole,
    addMember,
    invite,
    updateRole,
    removeMember,
    revokeInvite,
    lastInvite,
    clearLastInvite,
  }
}

export type OrgMembersController = ReturnType<typeof useOrgMembers>
