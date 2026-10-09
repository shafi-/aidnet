'use client'

import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import { useSubscription } from '@/hooks/useSubscription'
import {
  OrgConsolePage,
  NoPermission,
} from '@/components/console/OrgConsolePage'
import { SettingsTab } from '@/components/org/SettingsTab'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { currentOrg } = useOrganization()
  const { isOrgAdmin } = usePermissions()
  const { hasFeature } = useSubscription(currentOrg?.id ?? '')
  usePageTitle(t('titles.orgSettings'))

  // Settings needs both the role (org admin) and the plan feature — say
  // which one is missing instead of a generic denial.
  const roleAllows = !!currentOrg && isOrgAdmin()
  const allowed = roleAllows && hasFeature('settings')

  return (
    <OrgConsolePage title={t('console.sections.settings')}>
      {allowed ? (
        <SettingsTab orgId={currentOrg!.id} />
      ) : (
        <NoPermission
          body={roleAllows ? t('console.featureBody') : undefined}
        />
      )}
    </OrgConsolePage>
  )
}
