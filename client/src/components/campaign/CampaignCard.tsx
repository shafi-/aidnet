import Link from 'next/link'
import type { PublicCampaign } from '@/types'

export function CampaignCard({ campaign }: { campaign: PublicCampaign }) {
  return (
    <Link
      href={`/campaigns/detail?slug=${encodeURIComponent(campaign.slug)}`}
      className="block overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-md"
    >
      {campaign.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={campaign.cover_image_url}
          alt={campaign.title}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 font-semibold text-indigo-400">
          {campaign.org_name}
        </div>
      )}

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold text-gray-900">
            {campaign.title}
          </h3>
          {campaign.is_zakat_eligible && (
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
              Zakat
            </span>
          )}
        </div>

        <p className="truncate text-sm text-gray-500">{campaign.org_name}</p>

        {campaign.description && (
          <p className="line-clamp-2 text-sm text-gray-600">
            {campaign.description}
          </p>
        )}

        {campaign.goal_amount != null && (
          <p className="text-sm font-medium text-gray-900">
            Goal: {campaign.goal_amount.toLocaleString()} {campaign.currency}
          </p>
        )}
      </div>
    </Link>
  )
}
