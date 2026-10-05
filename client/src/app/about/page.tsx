'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function AboutPage() {
  const { t } = useTranslation()
  usePageTitle(t('about.pageTitle'))

  const steps = [
    t('about.howOrgs'),
    t('about.howCampaigns'),
    t('about.howDonors'),
    t('about.howRoles'),
  ]

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('about.title')}</h1>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('about.missionTitle')}
          </h2>
          <p className="leading-relaxed text-gray-600">
            {t('about.missionBody')}
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('about.howTitle')}
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-gray-600">
            {steps.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('about.trustTitle')}
          </h2>
          <p className="leading-relaxed text-gray-600">
            {t('about.trustBody')}
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t pt-6">
          <p className="text-gray-600">{t('about.contactPrompt')}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              href="/campaigns"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              {t('about.cta')}
            </Link>
            <Link
              href="/contact"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              {t('footer.contact')}
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
