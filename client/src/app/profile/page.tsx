'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { ProfileComponent } from '@/components/profile/ProfileComponent'
import { useProfile } from '@/hooks/useProfile'
import { useRequireAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTranslation } from 'react-i18next'

export default function ProfilePage() {
  useRequireAuth()
  const { t } = useTranslation()
  const controller = useProfile()
  usePageTitle(t('titles.profile'))

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <ProfileComponent controller={controller} />
      </div>
    </AppLayout>
  )
}
