/**
 * LAYER: DB / RPC provisioning contract (no UI).
 *
 * Catches failures at the layer where they occur. If approval stops
 * attaching membership or the baseline plan, THIS fails with that exact
 * cause — not a distant "Settings button not visible" in a dashboard spec.
 *
 * Invariant under test: however an org is created (approval flow here),
 * it ends up readable by its requester with an active admin/owner
 * membership and an active subscription granting baseline features.
 */
import { test, expect } from '@playwright/test'
import { signIn, rpc, expectOrgProvisioned, type Session } from './lib/api'

const PASSWORD = 'ContractPass123!'

async function registerViaApi(
  request: import('@playwright/test').APIRequestContext,
  email: string
): Promise<Session> {
  const res = await request.post(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'}/auth/v1/signup`,
    {
      data: { email, password: PASSWORD },
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    }
  )
  expect(res.ok(), `signup ${email}`).toBeTruthy()
  const body = (await res.json()) as { access_token?: string }
  // Local GoTrue may auto-confirm; if not, sign in.
  if (body.access_token)
    return { access_token: body.access_token, refresh_token: '' }
  return signIn(request, email, PASSWORD)
}

test.describe('Org provisioning contract', () => {
  let requester: Session
  let admin: Session
  let requestId: string

  test.beforeAll(async ({ request }) => {
    const stamp = Date.now()
    requester = await registerViaApi(
      request,
      `contract-user-${stamp}@example.com`
    )
    admin = await signIn(request, 'admin@donate.app', 'Password123!')
  })

  test('submitting a request creates exactly one pending request', async ({
    request,
  }) => {
    const slug = `contract-org-${Date.now()}`

    const created = await rpc<string | null>(
      request,
      requester,
      'submit_org_request',
      { p_org_name: `Contract Org ${Date.now()}`, p_org_slug: slug }
    )
    expect(created).toBeTruthy()

    const mine = await rpc<
      Array<{ id: string; status: string; org_slug: string }>
    >(request, requester, 'get_my_org_requests')
    const rows = mine.filter(r => r.org_slug === slug)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
    requestId = rows[0].id
  })

  test('approval provisions org + membership + baseline plan (contract)', async ({
    request,
  }) => {
    const orgId = await rpc<string | null>(
      request,
      admin,
      'approve_org_request',
      {
        p_request_id: requestId,
      }
    )
    expect(orgId, 'approve returns new org id').toBeTruthy()

    await expectOrgProvisioned(request, requester, orgId!, {
      role: 'admin',
      isOwner: true,
    })

    // Org is active and readable via the member listing function
    const mine = await rpc<Array<{ id: string; status: string }>>(
      request,
      requester,
      'get_my_organizations'
    )
    const row = mine.find(o => o.id === orgId)
    expect(row?.status).toBe('active')
  })
})
