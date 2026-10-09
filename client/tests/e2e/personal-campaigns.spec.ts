import { test, expect } from '@playwright/test'
import { anonRpc, rpc, signIn, USERS } from './lib/api'
import { orgReady } from './lib/ui'

// Individual fundraiser journey: a user with NO organization self-serves a
// campaign. Create-as-individual lazily provisions their personal org
// (ensure_my_personal_org), after which the standard org machinery — form,
// payment channels, review queue, public listing — applies unchanged.
// Uses the seeded org-less `individual@donate.app` (seed-auth.sh deletes any
// personal org left by earlier runs, so the journey always starts fresh).

const INDIVIDUAL_STATE = 'tests/e2e/.auth/individual.json'
const ADMIN_STATE = 'tests/e2e/.auth/systemAdmin.json'

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_URL not set — run against a local Supabase instance'
)

test.describe.serial('Individual fundraiser journey', () => {
  let slug = ''
  const bkash = '01755500000'

  test.describe('as org-less individual', () => {
    test.use({ storageState: INDIVIDUAL_STATE })

    test('When an org-less user creates as individual, the campaign is saved under the provisioned personal org', async ({
      page,
    }) => {
      await page.goto('/dashboard/campaigns/new')

      // No org yet: all three routes to a campaign are offered.
      await expect(
        page.getByRole('link', { name: 'Register a new organization' })
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'I have an invite' })
      ).toBeVisible()
      const cta = page.getByRole('button', { name: /start my own fundraiser/i })
      await expect(cta).toBeVisible()
      // The onboarding card re-mounts while the OrganizationProvider
      // finishes its bootstrap — wait, or the click hits a detached node.
      await orgReady(page)
      await cta.click()

      // Personal org provisioned + selected: the regular form renders.
      const title = `E2E Personal ${Date.now()}`
      await page.getByLabel('Title', { exact: true }).fill(title)
      await page.getByLabel('bKash number').fill(bkash)
      await page.getByRole('button', { name: 'Create Campaign' }).click()
      await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)

      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      await page
        .getByRole('button', { name: 'Submit for Review' })
        .first()
        .click()
      await expect(
        page.getByText(/pending_review|pending/i).first()
      ).toBeVisible()
    })
  })

  test.describe('contract', () => {
    test('When provisioning happened, the personal org, membership and campaign payment channels check out via RPC', async ({
      request,
    }) => {
      test.skip(!slug, 'UI step did not produce a campaign')

      const session = await signIn(
        request,
        USERS.individual.email,
        USERS.individual.password
      )

      const orgs = await rpc<
        Array<{ id: string; kind: string; status: string }>
      >(request, session, 'get_my_organizations')
      expect(orgs).toHaveLength(1)
      expect(orgs[0].kind).toBe('personal')
      expect(orgs[0].status).toBe('active')
      const orgId = orgs[0].id

      // Sole owner-admin: the standard gates must hold unchanged.
      const membership = await rpc<Array<{ role: string; is_owner: boolean }>>(
        request,
        session,
        'get_membership',
        { p_org_id: orgId }
      )
      expect(membership[0].role).toBe('admin')
      expect(membership[0].is_owner).toBe(true)

      const campaigns = await rpc<Array<{ id: string; slug: string }>>(
        request,
        session,
        'get_campaigns',
        { p_org_id: orgId }
      )
      const created = campaigns.find(c => c.slug === slug)
      expect(created, 'campaign listed under the personal org').toBeTruthy()

      const methods = await rpc<Array<{ bkash_number: string | null }>>(
        request,
        session,
        'get_campaign_payment_methods',
        { p_campaign_id: created!.id }
      )
      expect(methods[0]?.bkash_number).toBe(bkash)
    })
  })

  test.describe('as system admin', () => {
    test.use({ storageState: ADMIN_STATE })

    test('When admin verifies the personal campaign, it goes live publicly with its own payment channels', async ({
      page,
      request,
    }) => {
      test.skip(!slug, 'UI step did not produce a campaign')

      await page.goto(`/admin/campaigns/?slug=${slug}`)
      await expect(
        page.getByRole('button', { name: 'Verify & Publish' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Verify & Publish' }).click()
      await expect(page.getByText(/verified and published/i)).toBeVisible()

      // Anon sees the live personal campaign; donors pay the channel the
      // campaign itself declares.
      const detail = await anonRpc<
        Array<{
          org_name: string
          donation_methods: Array<{ bkash_number: string | null }>
        }>
      >(request, 'get_public_campaign_by_slug', { p_slug: slug })
      expect(detail).toHaveLength(1)
      expect(detail[0].donation_methods[0]?.bkash_number).toBe(bkash)
    })
  })
})
