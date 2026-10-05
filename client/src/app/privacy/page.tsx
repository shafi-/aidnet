'use client'

import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function PrivacyPage() {
  const { t } = useTranslation()
  usePageTitle(t('privacy.pageTitle'))

  const sections = [
    { title: t('privacy.collectTitle'), body: t('privacy.collectBody') },
    { title: t('privacy.useTitle'), body: t('privacy.useBody') },
    { title: t('privacy.noSellTitle'), body: t('privacy.noSellBody') },
    { title: t('privacy.securityTitle'), body: t('privacy.securityBody') },
    { title: t('privacy.rightsTitle'), body: t('privacy.rightsBody') },
    { title: t('privacy.childrenTitle'), body: t('privacy.childrenBody') },
    { title: t('privacy.changesTitle'), body: t('privacy.changesBody') },
    { title: t('privacy.contactTitle'), body: t('privacy.contactBody') },
  ]

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('privacy.title')}
        </h1>
        <p className="mt-2 text-sm text-gray-500">{t('privacy.updated')}</p>
        <p className="mt-4 leading-relaxed text-gray-600">
          {t('privacy.intro')}
        </p>

        <div className="mt-8 space-y-8">
          {sections.map(section => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {section.title}
              </h2>
              <p className="leading-relaxed text-gray-600">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
