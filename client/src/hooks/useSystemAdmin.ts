'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { systemAdminService } from '@/services/SystemAdminService'

export function useSystemAdmin() {
  const { user } = useAuth()
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdmin = useCallback(async () => {
    if (!user) {
      setIsSystemAdmin(false)
      setLoading(false)
      return
    }

    try {
      const result = await systemAdminService.isSystemAdmin()
      setIsSystemAdmin(result === true)
    } catch {
      setIsSystemAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    checkAdmin()
  }, [checkAdmin])

  return { isSystemAdmin, loading, refetch: checkAdmin }
}
