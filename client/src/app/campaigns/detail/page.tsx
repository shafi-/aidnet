'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { publicCampaignService } from '@/services/PublicCampaignService'
import type { PublicCampaign } from '@/types'
import { usePageTitle } from '@/hooks/usePageTitle'

function CampaignDetailContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug')
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTitle(campaign ? campaign.title : 'Campaign')

  const goal = campaign?.goal_amount
  const raised = campaign?.raised_amount ?? 0
  const pct =
    goal && goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0

  useEffect(() => {
    if (!slug) {
      setError('Missing campaign slug')
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    publicCampaignService
      .getPublicCampaignBySlug(slug)
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) {
          setError(err)
          setCampaign(null)
        } else if (!data) {
          setError('Campaign not found or not yet live')
          setCampaign(null)
        } else {
          setCampaign(data)
          setError(null)
        }
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [slug])

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/campaigns"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to campaigns
        </Link>

        {loading && (
          <div
            className="py-12 text-center text-gray-500"
            role="status"
            aria-live="polite"
          >
            Loading...
          </div>
        )}

        {error && (
          <div className="space-y-4 py-12 text-center" role="alert">
            <h1 className="text-2xl font-bold text-gray-900">
              Campaign Not Available
            </h1>
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {campaign && (
          <article className="space-y-8">
            <header className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {campaign.title}
                </h1>
                {campaign.is_zakat_eligible && (
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    Zakat Eligible
                  </span>
                )}
              </div>
              <p className="text-gray-500">
                by{' '}
                <Link
                  href={`/orgs/public?slug=${encodeURIComponent(campaign.org_slug)}`}
                  className="text-indigo-600 hover:underline"
                >
                  {campaign.org_name}
                </Link>
              </p>
            </header>

            {campaign.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                loading="lazy"
                className="w-full rounded-lg shadow"
              />
            )}

            {campaign.description && (
              <p className="whitespace-pre-line leading-relaxed text-gray-700">
                {campaign.description}
              </p>
            )}

            {campaign.goal_amount != null && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {campaign.raised_amount != null
                      ? campaign.raised_amount.toLocaleString()
                      : 0}{' '}
                    {campaign.currency} raised
                  </span>
                  <span>
                    {pct}% of {campaign.goal_amount.toLocaleString()}{' '}
                    {campaign.currency}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {campaign.goal_amount != null && (
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  Goal: {campaign.goal_amount.toLocaleString()}{' '}
                  {campaign.currency}
                </span>
              )}
              {campaign.start_date && (
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  Starts: {new Date(campaign.start_date).toLocaleDateString()}
                </span>
              )}
              {campaign.end_date && (
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  Ends: {new Date(campaign.end_date).toLocaleDateString()}
                </span>
              )}
            </div>

            {campaign.tags && campaign.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {campaign.tags.map(t => (
                  <span
                    key={t.id}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            )}

            <section className="space-y-4 rounded-lg bg-white p-6 shadow">
              <h2 className="text-xl font-semibold text-gray-900">
                Donate Directly
              </h2>
              <p className="text-sm text-gray-600">
                This platform does not process payments. Please donate directly
                to the organization using the methods below.
              </p>
              <DonationMethods methods={campaign.donation_methods} />
            </section>
          </article>
        )}
      </div>
    </AppLayout>
  )
}

function DonationMethods({
  methods,
}: {
  methods: PublicCampaign['donation_methods']
}) {
  if (!methods || methods.length === 0) {
    return <p className="text-gray-500">No donation methods listed yet.</p>
  }

  return (
    <div className="space-y-6">
      {methods.map((m, i) => {
        const rows: { label: string; value: string | null }[] = [
          {
            label: 'bKash',
            value: m.bkash_number
              ? `${m.bkash_number}${m.bkash_account_name ? ` (${m.bkash_account_name})` : ''}`
              : null,
          },
          {
            label: 'Nagad',
            value: m.nagad_number
              ? `${m.nagad_number}${m.nagad_account_name ? ` (${m.nagad_account_name})` : ''}`
              : null,
          },
          {
            label: 'Rocket',
            value: m.rocket_number
              ? `${m.rocket_number}${m.rocket_account_name ? ` (${m.rocket_account_name})` : ''}`
              : null,
          },
          {
            label: 'Bank',
            value: m.bank_name
              ? `${m.bank_name}${m.bank_account_number ? ` — ${m.bank_account_number}` : ''}${m.bank_account_name ? ` (${m.bank_account_name})` : ''}`
              : null,
          },
        ].filter(r => r.value)

        return (
          <div key={m.id ?? i} className="space-y-3 rounded-md border p-4">
            {m.is_preferred && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                Preferred
              </span>
            )}
            {m.donation_url && (
              <a
                href={m.donation_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
              >
                Donate via {m.donation_url.replace(/^https?:\/\//, '')}
              </a>
            )}
            {rows.map(r => (
              <div key={r.label} className="flex justify-between border-b pb-2">
                <span className="text-gray-500">{r.label}</span>
                <span className="text-right font-medium text-gray-900">
                  {r.value}
                </span>
              </div>
            ))}
            {m.instructions && (
              <p className="text-sm text-gray-600">{m.instructions}</p>
            )}
            {m.qr_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.qr_image_url}
                alt="Donation QR code"
                loading="lazy"
                className="h-40 w-40 rounded border object-contain"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CampaignDetailPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div
            className="py-12 text-center text-gray-500"
            role="status"
            aria-live="polite"
          >
            Loading...
          </div>
        </AppLayout>
      }
    >
      <CampaignDetailContent />
    </Suspense>
  )
}
