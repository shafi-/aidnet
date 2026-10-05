'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaginationParams } from '@/types/pagination'

interface UsePaginatedListOptions<T> {
  /** Service method that returns an array of items (rows), or null/[] on error */
  fetcher: (
    params: PaginationParams
  ) => Promise<{ data: T[] | null; error: string | null }>
  /** Items per page (default: 20) */
  limit?: number
  /** Set to false to prevent auto-load on mount (default: true) */
  enabled?: boolean
  /** Key used to derive the next cursor. Defaults to 'id' (sort order). */
  cursorKey?: keyof T
}

interface UsePaginatedListReturn<T> {
  items: T[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  reset: () => void
  refresh: () => Promise<void>
}

export function usePaginatedList<T>({
  fetcher,
  limit = 20,
  enabled = true,
  cursorKey = 'id' as keyof T,
}: UsePaginatedListOptions<T>): UsePaginatedListReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const mountedRef = useRef(false)

  // The next cursor is derived from the last item's id (or cursorKey). The
  // server returns rows ordered by id, so the client advances using the last
  // seen id — no separate next_cursor field is needed.
  const nextCursor = useCallback(
    (page: T[]): string | null => {
      if (page.length === 0) return null
      const last = page[page.length - 1]
      const value = last?.[cursorKey]
      return value != null ? String(value) : null
    },
    [cursorKey]
  )

  const fetchPage = useCallback(
    async (pageCursor: string | null, append: boolean) => {
      const result = await fetcher({ limit, cursor: pageCursor })
      if (result.error) {
        setError(result.error)
        return
      }
      const data = result.data ?? []
      setItems(prev => (append ? [...prev, ...data] : data))
      // has_more is inferred client-side: if we got fewer than `limit` rows,
      // there are no more pages.
      setHasMore(data.length === limit)
      setCursor(nextCursor(data))
      setError(null)
    },
    [fetcher, limit, nextCursor]
  )

  // Initial load
  useEffect(() => {
    if (!enabled) return
    if (mountedRef.current) return
    mountedRef.current = true
    void fetchPage(null, false).finally(() => setLoading(false))
  }, [enabled, fetchPage])

  // Load more (next page)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await fetchPage(cursor, true)
    setLoadingMore(false)
  }, [loadingMore, hasMore, cursor, fetchPage])

  // Reset to first page
  const reset = useCallback(() => {
    setItems([])
    setCursor(null)
    setHasMore(true)
    setError(null)
  }, [])

  // Refresh current data (reset + reload)
  const refresh = useCallback(async () => {
    reset()
    setLoading(true)
    await fetchPage(null, false)
    setLoading(false)
  }, [reset, fetchPage])

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reset,
    refresh,
  }
}
