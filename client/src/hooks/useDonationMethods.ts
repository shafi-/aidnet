'use client'

import { useState, useEffect, useCallback } from 'react'
import { donationMethodService } from '@/services/DonationMethodService'
import type { DonationMethod, DonationMethodDto } from '@/types'

export function useDonationMethods(orgId: string | null | undefined) {
  const [methods, setMethods] = useState<DonationMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orgId) {
      setMethods([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error: err } =
        await donationMethodService.getDonationMethods(orgId)
      if (err) {
        setError(err)
        setMethods([])
      } else {
        setMethods((data as DonationMethod[]) ?? [])
        setError(null)
      }
    } catch {
      setError('Failed to load donation methods')
      setMethods([])
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    load()
  }, [load])

  const upsert = useCallback(
    async (dto: DonationMethodDto) => {
      if (!orgId) return { error: 'No organization selected' }
      const { data, error: err } =
        await donationMethodService.upsertDonationMethods(orgId, dto)
      if (err) return { error: err }
      await load()
      return { error: null, data }
    },
    [orgId, load]
  )

  return { methods, loading, error, upsert, refetch: load }
}
