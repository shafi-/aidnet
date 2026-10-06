'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { resolveAccessLevel } from '@/lib/routeAccess'

/**
 * Central access evaluator — mounted once in the root layout.
 * Enforces the declarations in src/lib/routeAccess.ts:
 *   public        → render
 *   authenticated → redirect anon users to login (while loading: spinner)
 *   systemAdmin   → redirect anon to login; deny non-admins inline
 */
export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const level = resolveAccessLevel(pathname)

  const needsAuth = level === 'authenticated' || level === 'systemAdmin'
  const needsSystemAdmin = level === 'systemAdmin'

  useEffect(() => {
    if (!needsAuth) return
    if (!auth.loading && !auth.user) {
      router.push('/auth/login')
    }
  }, [needsAuth, auth.loading, auth.user, router])

  if (!needsAuth) return <>{children}</>

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>{t('common.loading')}</div>
      </div>
    )
  }

  if (!auth.user) {
    // Redirect is in flight; render nothing to avoid flashing protected UI.
    return null
  }

  if (!needsSystemAdmin) return <>{children}</>

  return <SystemAdminGate>{children}</SystemAdminGate>
}

function SystemAdminGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { isSystemAdmin, loading } = useSystemAdmin()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>{t('common.loading')}</div>
      </div>
    )
  }

  if (!isSystemAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('errors.accessDenied')}
          </h1>
          <p className="mt-2 text-gray-600">{t('errors.accessDeniedBody')}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-indigo-600 hover:underline"
          >
            {t('common.backToHome')}
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
