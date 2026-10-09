'use client'

import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import {
  OrgConsolePage,
  NoPermission,
} from '@/components/console/OrgConsolePage'
import { BillingTab } from '@/components/subscription/BillingTab'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function BillingPage() {
  const { t } = useTranslation()
  const { currentOrg } = useOrganization()
  const { isOrgOwner } = usePermissions()
  usePageTitle(t('titles.billing'))

  return (
    <OrgConsolePage title={t('console.sections.billing')}>
      {currentOrg && isOrgOwner() ? (
        <BillingTab orgId={currentOrg.id} isOwner={isOrgOwner()} />
      ) : (
        <NoPermission />
      )}
    </OrgConsolePage>
  )
}
