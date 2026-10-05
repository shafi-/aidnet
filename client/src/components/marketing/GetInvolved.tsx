'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const ctaClass =
  'inline-block rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700'

// Shown wherever campaigns would normally render but the platform has none
// yet: routes organizations, fundraisers, and aid seekers to the right entry
// point instead of ending in a dead end.
export function GetInvolved() {
  const { t } = useTranslation()

  const paths = [
    {
      title: t('getInvolved.orgsTitle'),
      body: t('getInvolved.orgsBody'),
      cta: t('getInvolved.orgsCta'),
      href: '/org/request',
    },
    {
      title: t('getInvolved.fundraiseTitle'),
      body: t('getInvolved.fundraiseBody'),
      cta: t('getInvolved.fundraiseCta'),
      href: '/org/request',
    },
    {
      title: t('getInvolved.aidTitle'),
      body: t('getInvolved.aidBody'),
      cta: t('getInvolved.aidCta'),
      href: '/contact',
    },
  ]

  return (
    <div className="rounded-lg border border-indigo-100 bg-white p-8 shadow-sm sm:p-10">
      <h3 className="text-center text-2xl font-bold text-gray-900">
        {t('getInvolved.title')}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-center leading-relaxed text-gray-600">
        {t('getInvolved.body')}
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {paths.map(path => (
          <div
            key={path.title}
            className="flex flex-col items-center rounded-lg border p-5 text-center"
          >
            <h4 className="font-semibold text-gray-900">{path.title}</h4>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
              {path.body}
            </p>
            <Link href={path.href} className={`mt-4 ${ctaClass}`}>
              {path.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
