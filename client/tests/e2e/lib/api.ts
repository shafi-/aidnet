import type { APIRequestContext } from '@playwright/test'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const USERS = {
  systemAdmin: { email: 'admin@donate.app', password: 'Password123!' },
  orgOwner: { email: 'owner@donate.app', password: 'Password123!' },
  orgMember: { email: 'member@donate.app', password: 'Password123!' },
} as const

export interface Session {
  access_token: string
  refresh_token: string
}

export async function signIn(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<Session> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    data: { email, password },
    headers: { apikey: SUPABASE_ANON_KEY },
  })
  if (!res.ok()) throw new Error(`signIn failed for ${email}: ${res.status()}`)
  return (await res.json()) as Session
}

export async function rpc<T>(
  request: APIRequestContext,
  session: Session,
  fn: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    data: args,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  })
  if (!res.ok()) throw new Error(`rpc ${fn} failed: ${res.status()}`)
  return (await res.json()) as T
}

/** Call an RPC with the anon key only — mirrors what the public site does. */
export async function anonRpc<T>(
  request: APIRequestContext,
  fn: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    data: args,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok()) throw new Error(`anon rpc ${fn} failed: ${res.status()}`)
  return (await res.json()) as T
}

export interface PublicCampaign {
  id: string
  title: string
  slug: string
  status: string
  is_zakat_eligible: boolean
}

/** Public campaign discovery — same RPC the landing / /campaigns UI calls. */
export async function getPublicCampaigns(
  request: APIRequestContext,
  opts: { zakat?: boolean; limit?: number } = {}
): Promise<PublicCampaign[]> {
  return anonRpc<PublicCampaign[]>(request, 'get_public_campaigns', {
    zakat_filter: opts.zakat ?? null,
    org_filter: null,
    result_limit: opts.limit ?? 50,
  })
}

/** Public single-campaign lookup — same RPC the detail page calls. */
export async function getCampaignBySlug(
  request: APIRequestContext,
  slug: string
): Promise<PublicCampaign | null> {
  const rows = await anonRpc<PublicCampaign[]>(request, 'get_campaign_by_slug', {
    p_slug: slug,
  })
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

export interface MyProfile {
  id: string
  email: string
  full_name: string | null
}

/** Authenticated profile lookup — same RPC the /profile page calls. */
export async function getMyProfile(
  request: APIRequestContext,
  session: Session
): Promise<MyProfile> {
  return rpc<MyProfile>(request, session, 'get_my_profile')
}

/** Feature keys in the org's active subscription — same RPC the app uses. */
export async function getOrgFeatures(
  request: APIRequestContext,
  session: Session
): Promise<string[]> {
  const orgs = await rpc<Array<{ id: string; slug: string }>>(
    request,
    session,
    'get_my_organizations'
  )
  const demoOrg = orgs.find((o) => o.slug === 'demo-org')
  if (!demoOrg) return []

  const subs = await rpc<Array<{ features: unknown }>>(
    request,
    session,
    'get_my_subscription',
    { p_org_id: demoOrg.id }
  )
  const raw = subs[0]?.features
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return Array.isArray(raw) ? raw : []
}
