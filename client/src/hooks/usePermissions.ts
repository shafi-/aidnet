'use client'

import { useCallback } from 'react'
import { useOrganization } from './useOrganization'

const PERMISSIONS = {
  admin: [
    'org:read',
    'org:update',
    'org:delete',
    'members:read',
    'members:create',
    'members:update',
    'members:delete',
    'invites:read',
    'invites:create',
    'invites:delete',
    'campaigns:read',
    'campaigns:create',
    'campaigns:update',
    'campaigns:delete',
  ],
  member: [
    'org:read',
    'members:read',
    'invites:read',
    'campaigns:read',
    'campaigns:create',
    'campaigns:update',
  ],
  viewer: ['org:read', 'members:read', 'campaigns:read'],
} as const

export function usePermissions() {
  const { membership } = useOrganization()

  const role = membership?.role ?? 'viewer'
  const isOwner = membership?.is_owner ?? false
  const permissions =
    PERMISSIONS[role as keyof typeof PERMISSIONS] ?? PERMISSIONS.viewer

  // Stable identities: consumers put these in effect/useCallback deps (e.g.
  // useOrgMembers reloads when `isOrgAdmin` changes) — a fresh function per
  // render would turn every render into a refetch.
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (isOwner) return true
      return permissions.includes(permission as never)
    },
    [isOwner, permissions]
  )

  const isOrgAdmin = useCallback((): boolean => role === 'admin', [role])
  const isOrgOwner = useCallback((): boolean => isOwner, [isOwner])
  const isOrgMember = useCallback(
    (): boolean => ['admin', 'member'].includes(role),
    [role]
  )

  return {
    role,
    isOwner,
    permissions,
    hasPermission,
    isOrgAdmin,
    isOrgOwner,
    isOrgMember,
  }
}
