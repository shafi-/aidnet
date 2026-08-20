import Link from 'next/link'
import type { PublicCampaign } from '@/types'

export function CampaignCard({ campaign }: { campaign: PublicCampaign }) {
  return (
    <Link
      href={`/campaigns/detail?slug=${encodeURIComponent(campaign.slug)}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
    >
      {campaign.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={campaign.cover_image_url}
          alt={campaign.title}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-400 font-semibold">
          {campaign.org_name}
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{campaign.title}</h3>
          {campaign.is_zakat_eligible && (
            <span className="shrink-0 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Zakat
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 truncate">{campaign.org_name}</p>

        {campaign.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{campaign.description}</p>
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
