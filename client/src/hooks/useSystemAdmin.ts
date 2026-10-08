'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { systemAdminService } from '@/services/SystemAdminService'

// System-admin status almost never changes, and the hook is mounted by the
// route guard, the nav and every admin page — so the RPC result is memoized
// per user for the SPA session: one call per page load, shared by all
// consumers and deduplicated while in flight. It resets on sign-out/account
// switch (cache is keyed by user id) and on a hard reload. `refetch`
// bypasses the cache for the rare case the role must be re-checked.
let cache: { userId: string | null; value: boolean } | null = null
let inFlight: { userId: string; promise: Promise<boolean> } | null = null

function resolveIsSystemAdmin(userId: string): Promise<boolean> {
  if (cache && cache.userId === userId) return Promise.resolve(cache.value)
  if (inFlight && inFlight.userId === userId) return inFlight.promise
  const promise = systemAdminService
    .isSystemAdmin()
    .then(value => {
      cache = { userId, value: value === true }
      return value === true
    })
    .catch(() => {
      // Failures are not cached — the next consumer retries.
      return false
    })
    .finally(() => {
      if (inFlight && inFlight.promise === promise) inFlight = null
    })
  inFlight = { userId, promise }
  return promise
}

export function useSystemAdmin() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const cached = cache && cache.userId === userId ? cache.value : null

  const [isSystemAdmin, setIsSystemAdmin] = useState(cached ?? false)
  const [loading, setLoading] = useState(cached === null)

  const checkAdmin = useCallback(
    async (bypassCache = false) => {
      if (bypassCache) cache = null
      if (userId === null) {
        cache = null
        setIsSystemAdmin(false)
        setLoading(false)
        return
      }
      const hit = cache && cache.userId === userId ? cache.value : null
      if (hit !== null) {
        // Cache hit — resolve without ever showing a loading state.
        setIsSystemAdmin(hit)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        setIsSystemAdmin(await resolveIsSystemAdmin(userId))
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  useEffect(() => {
    checkAdmin()
  }, [checkAdmin])

  const refetch = useCallback(() => checkAdmin(true), [checkAdmin])

  return { isSystemAdmin, loading, refetch }
}
