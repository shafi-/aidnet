/**
 * Organization Request Types
 */
export interface OrgRequest {
  id: string
  user_id: string
  org_name: string
  org_slug: string
  org_description: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  created_org_id: string | null
}

export interface OrgRequestWithUserInfo extends OrgRequest {
  user_email: string
  user_name: string | null
  reviewed_by_email: string | null
}

export interface CreateOrgRequestDto {
  orgName: string
  orgSlug: string
  orgDescription?: string
}

/**
 * Organization Metadata Types
 */
export interface OrgMeta {
  organization_id: string
  name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  social_links: Record<string, unknown>
  settings: Record<string, unknown>
  updated_by: string | null
  updated_at: string | null
}

export interface UpdateOrgMetaDto {
  name?: string
  description?: string
  logo_url?: string
  website_url?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  social_links?: Record<string, unknown>
  settings?: Record<string, unknown>
}

/**
 * Organization Status Types
 */
export type OrgStatus = 'active' | 'suspended'
