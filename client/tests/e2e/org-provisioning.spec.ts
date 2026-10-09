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
 *
 * Per AGENTS.md testing law: relies ONLY on seeded users — no custom
 * signUp (which is non-idempotent and collides across runs). Each test is
 * fully self-contained: it submits and approves its own org, so no shared
 * module state can leak between tests or break under suite ordering.
 */
import { test, expect } from '@playwright/test'
import { signIn, rpc, expectOrgProvisioned, type Session } from './lib/api'

const PASSWORD = 'Password123!'

test.describe('Org provisioning contract', () => {
  let requester: Session
  let admin: Session
  // Orgs provisioned here outlive the spec — tracked for afterAll cleanup,
  // otherwise the shared member fixture turns multi-org and breaks
  // auto-select for every later spec in the run.
  const createdOrgIds: string[] = []

  test.beforeAll(async ({ request }) => {
    requester = await signIn(request, 'member@donate.app', PASSWORD)
    admin = await signIn(request, 'admin@donate.app', PASSWORD)
  })

  test('submitting a request creates exactly one pending request', async ({
    request,
  }) => {
    const slug = `contract-org-${Date.now()}`

    const created = await rpc<string | null>(
      request,
      requester,
      'submit_org_request',
      {
        p_org_name: `Contract Org ${Date.now()}`,
        p_org_slug: slug,
      }
    )
    expect(created).toBeTruthy()

    const mine = await rpc<
      Array<{ id: string; status: string; org_slug: string }>
    >(request, requester, 'get_my_org_requests')
    const rows = mine.filter(r => r.org_slug === slug)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
  })

  test('approval provisions org + membership + baseline plan (contract)', async ({
    request,
  }) => {
    const slug = `contract-org-${Date.now()}`

    const requestId = await rpc<string | null>(
      request,
      requester,
      'submit_org_request',
      {
        p_org_name: `Contract Org ${Date.now()}`,
        p_org_slug: slug,
      }
    )
    expect(requestId, 'submit returns request id').toBeTruthy()

    const orgId = await rpc<string | null>(
      request,
      admin,
      'approve_org_request',
      {
        p_request_id: requestId,
      }
    )
    expect(orgId, 'approve returns new org id').toBeTruthy()
    createdOrgIds.push(orgId!)

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

  test.afterAll(async ({ request }) => {
    // delete_organization currently fails on the audit-trigger FK (the
    // organizations audit row references the org it is deleting), so leave
    // the orphaned org and just restore the shared member fixture to
    // single-org — the next `supabase db reset` clears the orphan.
    for (const orgId of createdOrgIds) {
      const profile = await rpc<Array<{ id: string }>>(
        request,
        requester,
        'get_my_profile'
      )
      await rpc(request, requester, 'remove_organization_member', {
        target_org_id: orgId,
        target_user_id: profile[0].id,
      })
    }
  })
})
