'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { ProfileComponent } from '@/components/profile/ProfileComponent'
import { useProfile } from '@/hooks/useProfile'
import { useRequireAuth } from '@/hooks/useAuth'

export default function ProfilePage() {
  useRequireAuth()
  const controller = useProfile()

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <ProfileComponent controller={controller} />
      </div>
    </AppLayout>
  )
}
