'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { usePublicCampaigns } from '@/hooks/usePublicCampaigns'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { Button } from '@/components/ui/button'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { GetInvolved } from '@/components/marketing/GetInvolved'
import { usePageTitle } from '@/hooks/usePageTitle'

function LandingCampaigns() {
  const { t } = useTranslation()
  const { campaigns, loading } = usePublicCampaigns({ limit: 12 })

  if (loading) {
    return (
      <div
        className="py-8 text-center text-gray-500"
        role="status"
        aria-live="polite"
      >
        {t('home.loadingCampaigns')}
      </div>
    )
  }

  if (!campaigns.length) {
    return <GetInvolved />
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {campaigns.map(c => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
    </div>
  )
}

function HowGivingWorks() {
  const { t } = useTranslation()

  const steps = [
    { title: t('home.how1Title'), body: t('home.how1Body') },
    { title: t('home.how2Title'), body: t('home.how2Body') },
    { title: t('home.how3Title'), body: t('home.how3Body') },
  ]

  return (
    <section className="mt-20">
      <h2 className="text-center text-2xl font-bold text-gray-900">
        {t('home.howTitle')}
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
              {index + 1}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {step.title}
            </h3>
            <p className="mt-2 text-gray-600">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ForOrganizations() {
  const { t } = useTranslation()

  const points = [
    t('home.orgsPoint1'),
    t('home.orgsPoint2'),
    t('home.orgsPoint3'),
  ]

  return (
    <section className="mt-20 rounded-lg bg-white p-8 shadow sm:p-10">
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('home.orgsTitle')}
          </h2>
          <p className="mt-3 leading-relaxed text-gray-600">
            {t('home.orgsBody')}
          </p>
          <Link
            href="/org/request"
            className="mt-6 inline-block rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700"
          >
            {t('home.orgsCta')}
          </Link>
        </div>
        <ul className="space-y-3">
          {points.map(point => (
            <li key={point} className="flex items-start gap-3">
              <svg
                className="mt-1 h-5 w-5 flex-none text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-600">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  usePageTitle(t('titles.home'))
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Nav />

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            {t('home.welcome')}
          </h1>
          <p className="mx-auto mt-5 max-w-md text-xl text-gray-500">
            {t('home.tagline')}
          </p>

          <div className="mt-10">
            {user ? (
              <div className="space-y-4">
                <p className="text-lg text-gray-600">
                  {t('home.welcomeBack', { email: user.email })}
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block rounded-md bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700"
                >
                  {t('home.goToDashboard')}
                </Link>
              </div>
            ) : (
              // The tagline promises discovery, so the primary action is
              // browsing — no account required. Sign-up stays secondary and
              // plainly named (DESIGN.md §1 voice rule).
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:space-x-4 sm:space-y-0">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/campaigns">{t('home.browseCampaigns')}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground sm:w-auto"
                >
                  <Link href="/auth/register">{t('nav.signUp')}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <HowGivingWorks />

        <section className="mt-20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {t('home.latestCampaigns')}
            </h2>
            <Link
              href="/campaigns"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              {t('home.seeMore')}
            </Link>
          </div>

          <LandingCampaigns />
        </section>

        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 text-indigo-600">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              {t('home.trustedTitle')}
            </h3>
            <p className="text-gray-600">{t('home.trustedBody')}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 text-indigo-600">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              {t('home.transparentTitle')}
            </h3>
            <p className="text-gray-600">{t('home.transparentBody')}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 text-indigo-600">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              {t('home.easyTitle')}
            </h3>
            <p className="text-gray-600">{t('home.easyBody')}</p>
          </div>
        </div>

        <ForOrganizations />
      </main>

      <Footer />
    </div>
  )
}
