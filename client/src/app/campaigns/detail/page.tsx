'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { publicCampaignService } from '@/services/PublicCampaignService'
import type { PublicCampaign } from '@/types'

function CampaignDetailContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug')
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setError('Missing campaign slug')
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    publicCampaignService
      .getPublicCampaigns({})
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) {
          setError(err)
          setCampaign(null)
        } else {
          const found = ((data as PublicCampaign[]) ?? []).find((c) => c.slug === slug)
          if (!found) {
            setError('Campaign not found or not yet live')
            setCampaign(null)
          } else {
            setCampaign(found)
            setError(null)
          }
        }
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [slug])

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Link href="/campaigns" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to campaigns
        </Link>

        {loading && <div className="text-center text-gray-500 py-12">Loading...</div>}

        {error && (
          <div className="text-center py-12 space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Campaign Not Available</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {campaign && (
          <article className="space-y-8">
            <header className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
                {campaign.is_zakat_eligible && (
                  <span className="shrink-0 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
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
                className="w-full rounded-lg shadow"
              />
            )}

            {campaign.description && (
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {campaign.description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {campaign.goal_amount != null && (
                <span className="bg-gray-100 px-3 py-1 rounded-md">
                  Goal: {campaign.goal_amount.toLocaleString()} {campaign.currency}
                </span>
              )}
              {campaign.start_date && (
                <span className="bg-gray-100 px-3 py-1 rounded-md">
                  Starts: {new Date(campaign.start_date).toLocaleDateString()}
                </span>
              )}
              {campaign.end_date && (
                <span className="bg-gray-100 px-3 py-1 rounded-md">
                  Ends: {new Date(campaign.end_date).toLocaleDateString()}
                </span>
              )}
            </div>

            {campaign.tags && campaign.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {campaign.tags.map((t) => (
                  <span key={t.id} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                    {t.label}
                  </span>
                ))}
              </div>
            )}

            <section className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Donate Directly</h2>
              <p className="text-sm text-gray-600">
                This platform does not process payments. Please donate directly to the
                organization using the methods below.
              </p>
              <DonationMethods methods={campaign.donation_methods} />
            </section>
          </article>
        )}
      </div>
    </AppLayout>
  )
}

function DonationMethods({ methods }: { methods: PublicCampaign['donation_methods'] }) {
  if (!methods || methods.length === 0) {
    return <p className="text-gray-500">No donation methods listed yet.</p>
  }

  const m = methods[0]
  const rows: { label: string; value: string | null }[] = [
    { label: 'bKash', value: m.bkash_number ? `${m.bkash_number}${m.bkash_account_name ? ` (${m.bkash_account_name})` : ''}` : null },
    { label: 'Nagad', value: m.nagad_number ? `${m.nagad_number}${m.nagad_account_name ? ` (${m.nagad_account_name})` : ''}` : null },
    { label: 'Rocket', value: m.rocket_number ? `${m.rocket_number}${m.rocket_account_name ? ` (${m.rocket_account_name})` : ''}` : null },
    { label: 'Bank', value: m.bank_name ? `${m.bank_name}${m.bank_account_number ? ` — ${m.bank_account_number}` : ''}${m.bank_account_name ? ` (${m.bank_account_name})` : ''}` : null },
  ].filter((r) => r.value)

  return (
    <div className="space-y-3">
      {m.donation_url && (
        <a
          href={m.donation_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 font-medium"
        >
          Donate via {m.donation_url.replace(/^https?:\/\//, '')}
        </a>
      )}
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between border-b pb-2">
          <span className="text-gray-500">{r.label}</span>
          <span className="font-medium text-gray-900 text-right">{r.value}</span>
        </div>
      ))}
      {m.instructions && <p className="text-sm text-gray-600">{m.instructions}</p>}
      {m.qr_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.qr_image_url} alt="Donation QR code" className="w-40 h-40 object-contain border rounded" />
      )}
    </div>
  )
}

export default function CampaignDetailPage() {
  return (
    <Suspense fallback={<AppLayout><div className="text-center py-12 text-gray-500">Loading...</div></AppLayout>}>
      <CampaignDetailContent />
    </Suspense>
  )
}
