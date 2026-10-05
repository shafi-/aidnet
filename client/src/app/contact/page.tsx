'use client'

import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePageTitle } from '@/hooks/usePageTitle'

// Replace with the real support inbox before launch.
const SUPPORT_EMAIL = 'support@donate.example'

export default function ContactPage() {
  const { t } = useTranslation()
  usePageTitle(t('contact.pageTitle'))

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('contact.title')}
        </h1>
        <p className="mt-4 leading-relaxed text-gray-600">
          {t('contact.intro')}
        </p>

        <section className="mt-8 rounded-lg border bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('contact.emailTitle')}
          </h2>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-2 inline-block font-medium text-indigo-600 hover:text-indigo-700"
          >
            {SUPPORT_EMAIL}
          </a>
          <p className="mt-3 text-sm text-gray-500">{t('contact.emailNote')}</p>
        </section>
      </div>
    </AppLayout>
  )
}
