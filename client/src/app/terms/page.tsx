'use client'

import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function TermsPage() {
  const { t } = useTranslation()
  usePageTitle(t('terms.pageTitle'))

  const sections = [
    { title: t('terms.acceptanceTitle'), body: t('terms.acceptanceBody') },
    { title: t('terms.accountsTitle'), body: t('terms.accountsBody') },
    {
      title: t('terms.organizationsTitle'),
      body: t('terms.organizationsBody'),
    },
    { title: t('terms.donationsTitle'), body: t('terms.donationsBody') },
    { title: t('terms.useTitle'), body: t('terms.useBody') },
    {
      title: t('terms.availabilityTitle'),
      body: t('terms.availabilityBody'),
    },
    { title: t('terms.changesTitle'), body: t('terms.changesBody') },
    { title: t('terms.contactTitle'), body: t('terms.contactBody') },
  ]

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('terms.title')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('terms.updated')}</p>
        <p className="mt-4 leading-relaxed text-gray-600">{t('terms.intro')}</p>

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
