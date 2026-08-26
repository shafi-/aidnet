'use client'

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react'
import { organizationService } from '@/services/OrganizationService'
import { memberService } from '@/services/MemberService'
import { useAuth } from './useAuth'
import { OrganizationSelector } from '@/components/org/OrganizationSelector'
import type {
  OrganizationDetailView,
  OrganizationView,
  Membership,
} from '@/types'

interface OrganizationContextType {
  currentOrg: OrganizationDetailView | null
  membership: Membership | null
  organizations: OrganizationView[]
  loading: boolean
  error: string | null
  selectionRequired: boolean
  setCurrentOrg: (org: OrganizationDetailView | null) => void
  selectOrgById: (orgId: string) => Promise<void>
  refreshOrg: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
)

const CURRENT_ORG_STORAGE_KEY = 'supanext.currentOrgId'

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const [currentOrg, rawSetCurrentOrg] =
    useState<OrganizationDetailView | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Set when an explicitly attempted org turns out to be suspended: the
  // selector must stay up (with the suspended org disabled) even though a
  // single other active org could be auto-selected.
  const [forcedSelection, setForcedSelection] = useState(false)

  const setCurrentOrg = useCallback((org: OrganizationDetailView | null) => {
    // Security check: prevent setting suspended orgs as current
    if (org && org.status === 'suspended') {
      console.warn('Cannot select suspended organization:', org.id)
      return
    }
    if (org) setForcedSelection(false)

    rawSetCurrentOrg(org)
    try {
      if (org?.id) localStorage.setItem(CURRENT_ORG_STORAGE_KEY, org.id)
      else localStorage.removeItem(CURRENT_ORG_STORAGE_KEY)
    } catch {
      // Ignore storage access errors
    }
  }, [])

  // Restore persisted org selection once the auth session is available.
  // Running before hydration would call get_organization unauthenticated
  // and silently drop the selection on every cold page load.
  useEffect(() => {
    if (!user?.id) return
    try {
      const persistedId = localStorage.getItem(CURRENT_ORG_STORAGE_KEY)
      if (persistedId && !currentOrg) {
        organizationService.getOrganization(persistedId).then(({ data }) => {
          if (data) {
            const org = data as OrganizationDetailView
            // Security check: only restore if org is still active
            if (org.status === 'active') {
              rawSetCurrentOrg(org)
            } else {
              // Clear persisted selection if org is suspended
              console.warn(
                'Persisted organization is suspended, clearing selection:',
                persistedId
              )
              localStorage.removeItem(CURRENT_ORG_STORAGE_KEY)
            }
          } else {
            // Persisted id is stale or invalid — clear it so a tampered or
            // deleted org reference cannot linger across sessions.
            localStorage.removeItem(CURRENT_ORG_STORAGE_KEY)
          }
        })
      }
    } catch {
      // Ignore storage access errors
    }
  }, [user?.id, currentOrg])

  const loadOrganizations = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await organizationService.getMyOrganizations()
    if (err) setError(err)
    if (data) setOrganizations(data)
    setLoading(false)
  }, [])

  // Load membership for the active/selected org. Re-runs whenever currentOrg
  // changes so permissions can never stick to a previous org. Clears on
  // empty/error (and when no org is selected) so a stale role from another org
  // can never drive usePermissions after a switch.

  // Single source of truth for "this org is suspended": reflect it in the
  // cached list (so the selector shows it disabled) and force the selector so
  // the suspension is visible. Used by both refresh + select paths.
  const markSuspended = useCallback((orgId: string) => {
    setOrganizations(prev =>
      prev.map(org =>
        org.id === orgId ? { ...org, status: 'suspended' as const } : org
      )
    )
    setForcedSelection(true)
  }, [])

  const refreshOrg = useCallback(async () => {
    if (currentOrg) {
      const { data } = await organizationService.getOrganization(currentOrg.id)
      if (data) {
        // Security check: clear current org if it became suspended
        if (data.status === 'suspended') {
          console.warn(
            'Current organization became suspended, clearing selection:',
            currentOrg.id
          )
          setCurrentOrg(null)
          markSuspended(data.id)
        } else {
          setCurrentOrg(data)
        }
      }
    }
  }, [currentOrg, setCurrentOrg, markSuspended])

  // Select an org by id from a URL param (e.g. invite links). Suspended or
  // unknown orgs never become current: suspended forces the selector so the
  // suspension is visible; unknown ids are cleared from storage.
  const selectOrgById = useCallback(
    async (targetId: string) => {
      const { data } = await organizationService.getOrganization(targetId)
      if (!data) {
        try {
          localStorage.removeItem(CURRENT_ORG_STORAGE_KEY)
        } catch {
          // Ignore storage access errors
        }
        return
      }
      if (data.status === 'suspended') {
        console.warn('Cannot select suspended organization:', data.id)
        markSuspended(data.id)
        return
      }
      try {
        localStorage.setItem(CURRENT_ORG_STORAGE_KEY, targetId)
      } catch {
        // Ignore storage access errors
      }
      setCurrentOrg(data)
    },
    [setCurrentOrg, markSuspended]
  )

  // Reload organizations once the auth session is available. On a full page
  // reload the session restores asynchronously, so the initial load can run
  // before the user exists and return an empty list.
  useEffect(() => {
    if (user?.id) loadOrganizations()
  }, [user?.id, loadOrganizations])

  // Selection requirement is DERIVED, never synced imperatively: scattered
  // setSelectionRequired(...) calls raced each other (e.g. an unconditional
  // clear-on-rerun wiped an explicit forced-selection from a suspended-org
  // attempt). One pure function of bootstrap state = one source of truth.
  const activeOrgs = useMemo(
    () => organizations.filter(org => org.status === 'active'),
    [organizations]
  )
  const selectionRequired =
    !loading &&
    !!user &&
    (forcedSelection ||
      (!!currentOrg && currentOrg.status === 'suspended') ||
      (!currentOrg && activeOrgs.length !== 1))

  // Deterministic readiness marker for tests and shell UIs: the provider has
  // session + org data settled and the selection decision is applied.
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-org-ready',
      String(!loading && !!user)
    )
  }, [loading, user])

  // Side-effects that remain imperative (they WRITE state): security-clear a
  // suspended current org, and auto-select when exactly one active org exists.
  // Everything else about the selector is derived above.
  useEffect(() => {
    if (!user || loading) return

    if (currentOrg && currentOrg.status === 'suspended') {
      console.warn(
        'Current organization is suspended, clearing selection:',
        currentOrg.id
      )
      setCurrentOrg(null)
      return
    }

    if (currentOrg || forcedSelection) return
    const active = organizations.filter(org => org.status === 'active')
    if (active.length === 1) void selectOrgById(active[0].id)
  }, [
    user,
    loading,
    organizations,
    currentOrg,
    forcedSelection,
    setCurrentOrg,
    selectOrgById,
  ])

  // Load membership whenever a current org exists (race-safe + self-clearing)
  useEffect(() => {
    if (!currentOrg) {
      setMembership(null)
      return
    }
    let active = true
    memberService.getMembership(currentOrg.id).then(({ data, error }) => {
      if (!active) return
      if (error || !data || data.length === 0) setMembership(null)
      else setMembership(data[0])
    })
    return () => {
      active = false
    }
  }, [currentOrg, currentOrg?.id])

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        membership,
        organizations,
        loading,
        error,
        selectionRequired,
        setCurrentOrg,
        selectOrgById,
        refreshOrg,
      }}
    >
      {children}
      {selectionRequired && (forcedSelection || !currentOrg) && (
        <OrganizationSelector
          organizations={organizations}
          onSelect={selectOrgById}
        />
      )}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error(
      'useOrganization must be used within an OrganizationProvider'
    )
  }
  return {
    ...context,
  }
}
