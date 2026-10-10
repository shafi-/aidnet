'use client'

import { Suspense, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useRequiredParam } from '@/hooks/useQueryParam'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'

/**
 * Pre-restructure the public org landing lived here. This shim forwards
 * old shared links to their new homes: /orgs?slug= (public landing) or
 * /manage/orgs?id= (authed selection).
 */
function LegacyPublicOrgRedirect() {
  const { t } = useTranslation()
  usePageTitle(t('titles.organization'))
  const router = useRouter()
  const slug = useRequiredParam('slug')
  const id = useRequiredParam('id')

  useEffect(() => {
    if (slug) {
      router.replace(`/orgs?slug=${encodeURIComponent(slug)}`)
    } else if (id) {
      router.replace(`/manage/orgs?id=${encodeURIComponent(id)}`)
    } else {
      router.replace('/orgs')
    }
  }, [slug, id, router])

  return (
    <AppLayout>
      <div className="py-12 text-center" role="status" aria-live="polite">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    </AppLayout>
  )
}

export default function LegacyPublicOrgPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="py-12 text-center">
            <div className="text-gray-500">{t('common.loading')}</div>
          </div>
        </AppLayout>
      }
    >
      <LegacyPublicOrgRedirect />
    </Suspense>
  )
}
