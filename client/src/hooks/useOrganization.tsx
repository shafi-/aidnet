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
import type { OrganizationDetailView, Membership } from '@/types'

interface OrganizationContextType {
  currentOrg: OrganizationDetailView | null
  membership: Membership | null
  organizations: OrganizationDetailView[]
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
  const [organizations, setOrganizations] = useState<OrganizationDetailView[]>(
    []
  )
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
  }, [user?.id])

  const loadOrganizations = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await organizationService.getMyOrganizations()
    if (err) setError(err)
    if (data) setOrganizations(data as unknown as OrganizationDetailView[])
    setLoading(false)
  }, [])

  const loadMembership = useCallback(async (orgId: string) => {
    const { data } = await memberService.getMembership(orgId)
    if (data && data.length > 0) {
      setMembership(data[0])
    }
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
          // Reflect the suspension in the cached list so the selection
          // effect does not immediately re-select the now-suspended org.
          setOrganizations(prev =>
            prev.map(org =>
              org.id === data.id
                ? { ...org, status: 'suspended' as const }
                : org
            )
          )
          setForcedSelection(true)
        } else {
          setCurrentOrg(data)
        }
      }
    }
  }, [currentOrg, setCurrentOrg, setOrganizations])

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
        setOrganizations(prev =>
          prev.map(org =>
            org.id === data.id ? { ...org, status: 'suspended' as const } : org
          )
        )
        setForcedSelection(true)
        return
      }
      try {
        localStorage.setItem(CURRENT_ORG_STORAGE_KEY, targetId)
      } catch {
        // Ignore storage access errors
      }
      setCurrentOrg(data as OrganizationDetailView)
    },
    [setCurrentOrg]
  )

  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

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
    if (active.length === 1) setCurrentOrg(active[0])
  }, [user, loading, organizations, currentOrg, forcedSelection, setCurrentOrg])

  // Load membership whenever a current org exists
  useEffect(() => {
    if (currentOrg) loadMembership(currentOrg.id)
  }, [currentOrg, currentOrg?.id, loadMembership])

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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-2xl space-y-6 rounded-lg bg-white p-8 shadow">
            <h1 className="text-center text-2xl font-bold">
              Select an Organization
            </h1>
            <p className="text-center text-gray-600">
              You belong to multiple organizations. Choose one to continue.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {organizations.map(org => {
                const isSuspended = org.status === 'suspended'
                return (
                  <button
                    key={org.id}
                    onClick={() => setCurrentOrg(org)}
                    disabled={isSuspended}
                    className={`rounded-lg border p-6 text-left transition-colors ${
                      isSuspended
                        ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60'
                        : 'hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <h2 className="text-lg font-semibold">{org.name}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {org.description ?? 'No description'}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {org.member_count} members
                    </p>
                    {isSuspended && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        Suspended
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
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
