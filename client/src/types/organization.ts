export interface Organization {
  id: string
  slug: string
  status: 'active' | 'suspended'
  created_by: string
  created_at: string
  updated_at: string
}

export interface OrganizationView extends Organization {
  user_id: string
  user_role: string
  membership_status: string
  joined_at: string
  // Combined with org_meta data for display
  name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  social_links: Record<string, any>
  settings: Record<string, any>
}

export interface OrganizationDetailView extends Organization {
  member_count: number
  // Combined with org_meta data for display
  name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  social_links: Record<string, any>
  settings: Record<string, any>
}

// Note: Organization creation is now done via org_request, not direct creation
// CreateOrganizationDto is kept for backward compatibility but should use CreateOrgRequestDto
export interface CreateOrganizationDto {
  slug: string
  settings?: Record<string, unknown>
}

// Note: Organization updates are now handled via org_meta
// UpdateOrganizationDto is kept for backward compatibility
export interface UpdateOrganizationDto {
  status?: 'active' | 'suspended'
}
