'use client'

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react'
import { organizationService } from '@/services/OrganizationService'
import { memberService } from '@/services/MemberService'
import { useAuth } from './useAuth'
import { useSystemAdmin } from './useSystemAdmin'
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
  suspensionMessage: string | null
  setCurrentOrg: (org: OrganizationDetailView | null) => void
  selectOrgById: (orgId: string) => Promise<void>
  refreshOrg: () => Promise<void>
  clearSuspensionMessage: () => void
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
)

const CURRENT_ORG_STORAGE_KEY = 'supanext.currentOrgId'

function readPersistedOrgId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(CURRENT_ORG_STORAGE_KEY)
  } catch {
    return null
  }
}

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const { isSystemAdmin } = useSystemAdmin()
  const [currentOrg, rawSetCurrentOrg] =
    useState<OrganizationDetailView | null>(() => {
      const id = readPersistedOrgId()
      if (!id) return null
      // Minimal stub — enough to prevent the selector from flashing while the
      // background verify fills in the real data. If the org turns out to be
      // suspended, the verify clears it.
      return {
        id,
        slug: '',
        status: 'active',
        created_by: '',
        created_at: '',
        updated_at: '',
        member_count: 0,
        name: '',
        description: null,
        logo_url: null,
        website_url: null,
        contact_email: null,
        contact_phone: null,
        address: null,
        social_links: {},
        settings: {},
      } as OrganizationDetailView
    })
  const [membership, setMembership] = useState<Membership | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Tracks whether the persisted currentOrg has been restored from localStorage.
  // data-org-ready waits on this so tests never race the async restoration.
  const [restored, setRestored] = useState(false)
  // Set when an explicitly attempted org turns out to be suspended: the
  // selector must stay up (with the suspended org disabled) even though a
  // single other active org could be auto-selected.
  const [forcedSelection, setForcedSelection] = useState(false)
  // Message shown to the user when their current org was suspended by an
  // admin while they were using it. Cleared when the user selects a new org.
  const [suspensionMessage, setSuspensionMessage] = useState<string | null>(
    null
  )

  const setCurrentOrg = useCallback((org: OrganizationDetailView | null) => {
    // Security check: prevent setting suspended orgs as current
    if (org && org.status === 'suspended') {
      console.warn('Cannot select suspended organization:', org.id)
      return
    }
    if (org) {
      setForcedSelection(false)
      setSuspensionMessage(null)
    }

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
  // Sets `restored` when done so data-org-ready can wait on the full state.
  // Restore persisted org selection once per user session. The effect runs
  // when user?.id becomes available (auth session restored). It must NOT
  // depend on currentOrg — that would cause it to re-fire when currentOrg is
  // set (by auto-select or selectOrgById), resetting `restored` to false and
  // re-triggering the async restore, creating an infinite loop.
  //
  // currentOrg is already initialised synchronously from localStorage (see
  // readPersistedOrg above), so the selector hides instantly. This effect
  // only needs to verify the persisted id is still valid (org not suspended /
  // deleted) and mark `restored` for data-org-ready.
  const restoreRanRef = useRef(false)
  useEffect(() => {
    if (!user?.id || restoreRanRef.current) return
    restoreRanRef.current = true
    try {
      const persistedId = localStorage.getItem(CURRENT_ORG_STORAGE_KEY)
      if (persistedId) {
        // Verify in background: fetch fresh data, correct if suspended/stale
        organizationService.getOrganization(persistedId).then(({ data }) => {
          if (data) {
            const org = data as OrganizationDetailView
            if (org.status === 'active') {
              rawSetCurrentOrg(org)
            } else {
              console.warn(
                'Persisted organization is suspended, clearing selection:',
                persistedId
              )
              rawSetCurrentOrg(null)
              localStorage.removeItem(CURRENT_ORG_STORAGE_KEY)
            }
          } else {
            localStorage.removeItem(CURRENT_ORG_STORAGE_KEY)
            rawSetCurrentOrg(null)
          }
          setRestored(true)
        })
      } else {
        setRestored(true)
      }
    } catch {
      setRestored(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const loadOrganizations = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await organizationService.getMyOrganizations({
      limit: 100,
    })
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

  const clearSuspensionMessage = useCallback(() => {
    setSuspensionMessage(null)
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

  // Listen for suspension events emitted by the RPC client when a DB
  // function returns "Not authorized" (can_perform denied because the org
  // was suspended by a system admin since the user's last check).
  useEffect(() => {
    const handler = (event: Event) => {
      const { orgId } = (event as CustomEvent).detail
      if (!orgId) return

      // Mark suspended in the cached list so the selector disables it
      setOrganizations(prev =>
        prev.map(org =>
          org.id === orgId ? { ...org, status: 'suspended' as const } : org
        )
      )

      // If this was the active org, clear it and force selector
      if (currentOrg?.id === orgId) {
        rawSetCurrentOrg(null)
        try {
          localStorage.removeItem(CURRENT_ORG_STORAGE_KEY)
        } catch {
          // Ignore storage access errors
        }
        setForcedSelection(true)
        setSuspensionMessage(
          'Your organization has been suspended. Please select another organization or contact your system admin.'
        )
      }
    }

    window.addEventListener('organization-suspended', handler)
    return () => window.removeEventListener('organization-suspended', handler)
  }, [currentOrg?.id])

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
    !isSystemAdmin &&
    (forcedSelection ||
      (!!currentOrg && currentOrg.status === 'suspended') ||
      (!currentOrg && activeOrgs.length !== 1))

  // Deterministic readiness marker for tests and shell UIs: the provider has
  // session + org data settled AND the persisted currentOrg has been restored.
  // Tests must wait for this — it only flips true once: loading is false,
  // user exists, and the restore effect has completed.
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-org-ready',
      String(!loading && !!user && restored)
    )
  }, [loading, user, restored])

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

  // Load membership whenever a current org exists.
  // Race condition guard: prevent state updates on unmounted components.
  // If the component unmounts while the async operation is in flight, the
  // cleanup function sets active=false, preventing setState calls on an
  // unmounted component. This avoids memory leaks and React warnings.
  // DO NOT REMOVE - this is a critical safety pattern for async operations.
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
        suspensionMessage,
        setCurrentOrg,
        selectOrgById,
        refreshOrg,
        clearSuspensionMessage,
      }}
    >
      {children}
      {selectionRequired && (forcedSelection || !currentOrg) && (
        <OrganizationSelector
          organizations={organizations}
          onSelect={selectOrgById}
          message={suspensionMessage}
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
