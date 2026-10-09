'use client'

import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { useSubscription } from '@/hooks/useSubscription'
import {
  OrgConsolePage,
  NoPermission,
} from '@/components/console/OrgConsolePage'
import { MembersPanel } from '@/components/org/MembersPanel'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function MembersPage() {
  const { t } = useTranslation()
  const { currentOrg } = useOrganization()
  const { hasFeature } = useSubscription(currentOrg?.id ?? '')
  usePageTitle(t('titles.orgMembers'))

  return (
    <OrgConsolePage title={t('console.sections.members')}>
      {currentOrg && hasFeature('members') ? (
        <MembersPanel orgId={currentOrg.id} />
      ) : (
        <NoPermission body={t('console.featureBody')} />
      )}
    </OrgConsolePage>
  )
}
