'use client'

import {
  useState,
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
  const [selectionRequired, setSelectionRequired] = useState(false)

  const setCurrentOrg = useCallback((org: OrganizationDetailView | null) => {
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
          if (data) rawSetCurrentOrg(data as OrganizationDetailView)
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
      if (data) setCurrentOrg(data)
    }
  }, [currentOrg, setCurrentOrg])

  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

  // Reload organizations once the auth session is available. On a full page
  // reload the session restores asynchronously, so the initial load can run
  // before the user exists and return an empty list.
  useEffect(() => {
    if (user?.id) loadOrganizations()
  }, [user?.id, loadOrganizations])

  // Enforce org selection for users with multiple orgs
  useEffect(() => {
    if (!user || loading) return
    // Auto-select if user has only one org
    if (organizations.length === 1 && !currentOrg) {
      setCurrentOrg(organizations[0])
      setSelectionRequired(false)
    } else if (organizations.length > 1 && !currentOrg) {
      setSelectionRequired(true)
    } else {
      setSelectionRequired(false)
    }
  }, [user, loading, organizations, currentOrg, setCurrentOrg])

  // Clear selection required when org is selected
  useEffect(() => {
    if (currentOrg) {
      setSelectionRequired(false)
      loadMembership(currentOrg.id)
    }
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
        refreshOrg,
      }}
    >
      {selectionRequired ? (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-2xl space-y-6 rounded-lg bg-white p-8 shadow">
            <h1 className="text-center text-2xl font-bold">
              Select an Organization
            </h1>
            <p className="text-center text-gray-600">
              You belong to multiple organizations. Choose one to continue.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {organizations.map(org => (
                <button
                  key={org.id}
                  onClick={() => setCurrentOrg(org)}
                  className="rounded-lg border p-6 text-left transition-colors hover:border-blue-500 hover:bg-blue-50"
                >
                  <h2 className="text-lg font-semibold">{org.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {org.description ?? 'No description'}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {org.member_count} members
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        children
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
