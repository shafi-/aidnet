// Campaign domain types (mirrors generated database.ts row shapes)

export type CampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'live'
  | 'rejected'
  | 'closed'

export type Campaign = {
  id: string
  org_id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  goal_amount: number | null
  currency: string | null
  start_date: string | null
  end_date: string | null
  is_zakat_eligible: boolean | null
  status: CampaignStatus | null
  created_by: string | null
  verified_by: string | null
  verified_at: string | null
  verification_notes: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export type DonationMethod = {
  id: string
  organization_id: string
  bkash_number: string | null
  bkash_account_name: string | null
  nagad_number: string | null
  nagad_account_name: string | null
  rocket_number: string | null
  rocket_account_name: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  bank_routing_number: string | null
  bank_branch: string | null
  donation_url: string | null
  qr_image_url: string | null
  instructions: string | null
  is_preferred: boolean | null
  created_at: string | null
  updated_at: string | null
}

export type CampaignTag = {
  id: string
  slug: string
  label: string
  label_bn: string | null
}

export type PublicCampaign = {
  id: string
  org_id: string
  org_name: string
  org_slug: string
  org_logo_url: string | null
  org_description: string | null
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  goal_amount: number | null
  currency: string | null
  start_date: string | null
  end_date: string | null
  is_zakat_eligible: boolean | null
  created_at: string | null
  updated_at: string | null
  donation_methods: DonationMethod[]
  tags: CampaignTag[]
}

// DTOs used by services

export type CreateCampaignDto = {
  orgId: string
  title: string
  slug: string
  description?: string | null
  coverImageUrl?: string | null
  goalAmount?: number | null
  currency?: string
  startDate?: string | null
  endDate?: string | null
  isZakatEligible?: boolean
}

export type UpdateCampaignDto = {
  title?: string
  slug?: string
  description?: string | null
  coverImageUrl?: string | null
  goalAmount?: number | null
  currency?: string
  startDate?: string | null
  endDate?: string | null
  isZakatEligible?: boolean
  status?: CampaignStatus
}

export type DonationMethodDto = {
  bkashNumber?: string | null
  bkashAccountName?: string | null
  nagadNumber?: string | null
  nagadAccountName?: string | null
  rocketNumber?: string | null
  rocketAccountName?: string | null
  bankName?: string | null
  bankAccountNumber?: string | null
  bankAccountName?: string | null
  bankRoutingNumber?: string | null
  bankBranch?: string | null
  donationUrl?: string | null
  qrImageUrl?: string | null
  instructions?: string | null
  isPreferred?: boolean
}

export type PublicCampaignFilters = {
  zakat?: boolean | null
  org?: string | null
  limit?: number | null
}
