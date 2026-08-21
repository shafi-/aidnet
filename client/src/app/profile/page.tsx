'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { ProfileComponent } from '@/components/profile/ProfileComponent'
import { useRequireAuth } from '@/hooks/useAuth'

export default function ProfilePage() {
  useRequireAuth()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <ProfileComponent />
      </div>
    </AppLayout>
  )
}
