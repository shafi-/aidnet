'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { usePublicCampaigns } from '@/hooks/usePublicCampaigns'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { Nav } from '@/components/layout/Nav'
import { usePageTitle } from '@/hooks/usePageTitle'

function LandingCampaigns() {
  const { campaigns, loading } = usePublicCampaigns({ limit: 12 })

  if (loading) {
    return (
      <div
        className="py-8 text-center text-gray-500"
        role="status"
        aria-live="polite"
      >
        Loading campaigns...
      </div>
    )
  }

  if (!campaigns.length) {
    return (
      <div className="py-8 text-center text-gray-500">
        No live campaigns yet. Check back soon.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {campaigns.map(c => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
    </div>
  )
}

export default function HomePage() {
  usePageTitle('Donate — Discover campaigns that matter')
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
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Nav />

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Welcome to Donate
          </h2>
          <p className="mx-auto mt-5 max-w-md text-xl text-gray-500">
            Discover campaigns that matter and support the causes you care about
          </p>

          <div className="mt-10">
            {user ? (
              <div className="space-y-4">
                <p className="text-lg text-gray-600">
                  Welcome back, {user.email}!
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block rounded-md bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700"
                >
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              <div className="flex justify-center space-x-4">
                <Link
                  href="/auth/register"
                  className="inline-block rounded-md bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700"
                >
                  Get Started
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-block rounded-md border border-indigo-600 bg-white px-8 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>

        <section className="mt-20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Latest Campaigns
            </h2>
            <Link
              href="/campaigns"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              See more →
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
              Trusted Organizations
            </h3>
            <p className="text-gray-600">
              Every organization is reviewed and approved before they can launch
              campaigns.
            </p>
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
              Transparent Campaigns
            </h3>
            <p className="text-gray-600">
              Browse live campaigns with clear goals, descriptions, and donation
              methods.
            </p>
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
              Easy Donations
            </h3>
            <p className="text-gray-600">
              Multiple payment methods and a streamlined flow to get your
              support where it matters.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
