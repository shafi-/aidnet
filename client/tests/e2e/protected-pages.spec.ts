import { test, expect } from '@playwright/test'
import { rpc, signIn, USERS } from './lib/api'
import { gotoStable, loginViaUi } from './lib/ui'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }

test.describe('Protected Pages', () => {
  test.describe('Profile Page', () => {
    test('When not authenticated, /profile redirects to login', async ({
      page,
    }) => {
      await gotoStable(page, '/profile/')
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('When authenticated, profile shows the user email', async ({
      page,
    }) => {
      await loginViaUi(page, OWNER.email, OWNER.password)

      await gotoStable(page, '/profile/')
      await expect(page.locator('h1')).toContainText('Profile')
      await expect(
        page.getByRole('paragraph').filter({ hasText: OWNER.email })
      ).toBeVisible()
    })
  })

  test.describe('Orgs Page', () => {
    test('When not authenticated, visiting /orgs redirects to login', async ({
      page,
    }) => {
      await gotoStable(page, '/orgs/')
      await expect(page).toHaveURL(/\/auth\/login\//)
    })

    test('When authenticated, /orgs shows the organization list', async ({
      page,
    }) => {
      await loginViaUi(page, OWNER.email, OWNER.password)

      await gotoStable(page, '/orgs/')
      await expect(
        page.getByRole('heading', { name: 'Organizations' })
      ).toBeVisible()
      // Request-flow UX: creation happens via the request CTA (link), not an
      // inline Create Organization button.
      await expect(
        page.getByRole('link', { name: 'Request an organization' })
      ).toBeVisible()
    })
  })

  test.describe('Invite Page', () => {
    // Well-formed (64-hex) but unknown token: exercises the full
    // validate_invite(token, email) round-trip ending in a DB null.
    const unknownToken = 'a'.repeat(64)

    test('When email submitted against unknown token, Invalid Invite is shown', async ({
      page,
    }) => {
      await gotoStable(page, `/invite/?token=${unknownToken}`)
      await page.getByPlaceholder('you@example.com').fill('someone@example.com')
      await page.getByRole('button', { name: 'Check Invite' }).click()
      await expect(
        page.getByRole('heading', { name: 'Invalid Invite' })
      ).toBeVisible()
    })

    test('When malformed token submitted with email, Invalid Invite is shown', async ({
      page,
    }) => {
      await gotoStable(page, '/invite/?token=invalidtoken')
      await page.getByPlaceholder('you@example.com').fill('someone@example.com')
      await page.getByRole('button', { name: 'Check Invite' }).click()
      await expect(
        page.getByRole('heading', { name: 'Invalid Invite' })
      ).toBeVisible()
    })

    test('When empty token supplied, invite page renders', async ({ page }) => {
      await gotoStable(page, '/invite/')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Join an organization via pasted invite', () => {
    test.skip(
      !process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL not set — run against a local Supabase instance'
    )
    test.use({ storageState: 'tests/e2e/.auth/individual.json' })

    let inviteToken = ''

    test('When the org owner invites an org-less user, an invite code exists', async ({
      request,
    }) => {
      const owner = await signIn(
        request,
        USERS.orgOwner.email,
        USERS.orgOwner.password
      )
      const orgs = await rpc<Array<{ id: string }>>(
        request,
        owner,
        'get_my_organizations'
      )
      expect(orgs.length).toBeGreaterThan(0)
      const orgId = orgs[0].id

      // Revoke stale invites for the joiner so re-runs always start clean.
      const existing = await rpc<
        Array<{ id: string; email: string; accepted_at: string | null }>
      >(request, owner, 'get_invites', { p_organization_id: orgId })
      for (const inv of existing.filter(
        i => i.email === USERS.individual.email
      )) {
        await rpc(request, owner, 'revoke_invite', { p_invite_id: inv.id })
      }

      // rpc() returns the raw PostgREST payload — SETOF functions arrive
      // wrapped in an array (AGENTS.md known gotcha).
      const invite = await rpc<Array<{ token: string }>>(
        request,
        owner,
        'create_invite',
        {
          p_organization_id: orgId,
          p_email: USERS.individual.email,
          p_role: 'member',
        }
      )
      inviteToken = invite[0]?.token ?? ''
      expect(inviteToken).toBeTruthy()
    })

    test('When the invited user pastes the invite link, they join the organization', async ({
      page,
      request,
    }) => {
      test.skip(!inviteToken, 'invite was not created')

      // No token in the URL: the paste-entry state of the join page.
      await gotoStable(page, '/invite/')
      await expect(
        page.getByRole('heading', {
          name: 'Were you invited to an organization?',
        })
      ).toBeVisible()

      // Paste the FULL link — exercises the URL-parsing path.
      await page
        .getByPlaceholder('Paste invite link or code')
        .fill(`http://localhost:3000/invite/?token=${inviteToken}`)
      await page.getByRole('button', { name: 'Continue' }).click()

      // The standard token flow takes over: email → org reveal → accept.
      await page
        .getByPlaceholder('you@example.com')
        .fill(USERS.individual.email)
      await page.getByRole('button', { name: 'Check Invite' }).click()
      await expect(
        page.getByRole('heading', { name: /Demo Organization/ })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Accept Invitation' }).click()
      await expect(
        page.getByRole('heading', { name: 'Welcome!' })
      ).toBeVisible()
      await page.waitForURL(/\/orgs/, { timeout: 10000 })

      // Teardown: the shared seeded joiner must end org-less again —
      // personal-campaigns.spec depends on this fixture state.
      const joiner = await signIn(
        request,
        USERS.individual.email,
        USERS.individual.password
      )
      const profileRaw = await rpc<{ id: string } | Array<{ id: string }>>(
        request,
        joiner,
        'get_my_profile'
      )
      const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw
      const owner = await signIn(
        request,
        USERS.orgOwner.email,
        USERS.orgOwner.password
      )
      const orgs = await rpc<Array<{ id: string }>>(
        request,
        owner,
        'get_my_organizations'
      )
      const removed = await rpc<boolean>(
        request,
        owner,
        'remove_organization_member',
        { target_org_id: orgs[0].id, target_user_id: profile!.id }
      )
      expect(removed).toBe(true)
    })
  })
})
