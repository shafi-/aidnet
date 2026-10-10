import { test, expect } from '@playwright/test'
import { gotoStable } from './lib/ui'

test.describe.serial('Public Org Directory & Landing', () => {
  test.beforeAll(async () => {
    test.skip(
      !process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL not set — run against a local Supabase instance'
    )
  })

  // Use the seeded demo org — no signup or trigger dependency needed.
  const testSlug = 'demo-org'

  test('When /orgs is opened without a slug, the public org directory is shown', async ({
    page,
  }) => {
    await gotoStable(page, '/orgs/')
    await expect(
      page.locator('h1:has-text("Organizations on AidNet")')
    ).toBeVisible()
    await expect(page.locator(`a[href*="slug=${testSlug}"]`)).toBeVisible()
  })

  test('When valid slug opened, public org page shows org info', async ({
    page,
  }) => {
    await gotoStable(page, `/orgs/?slug=${testSlug}`)
    await expect(page.locator('h1')).toContainText('Demo Organization')
    await expect(
      page.getByText('Organization for testing and demonstration purposes')
    ).toBeVisible()
  })

  test('When public org page opened, campaigns section is shown without auth CTAs', async ({
    page,
  }) => {
    await gotoStable(page, `/orgs/?slug=${testSlug}`)
    await expect(
      page.getByRole('heading', { name: 'Campaigns by Demo Organization' })
    ).toBeVisible()
    // The landing already shows the org's campaigns — no sign-up prompts and
    // no redundant browse-all button.
    await expect(
      page.locator('main').getByRole('link', { name: 'Sign In' })
    ).toHaveCount(0)
    await expect(
      page.locator('main').getByRole('link', { name: 'Create Account' })
    ).toHaveCount(0)
    await expect(
      page.locator('main').getByRole('link', { name: 'Browse campaigns' })
    ).toHaveCount(0)
  })

  test('When See all clicked on the org landing, the campaigns list is filtered by that org', async ({
    page,
  }) => {
    await gotoStable(page, `/orgs/?slug=${testSlug}`)
    await page.getByRole('link', { name: 'See all' }).click()
    await expect(page).toHaveURL(/\/campaigns\?org=/)
    // The filtered state is visible: a named, removable org filter pill.
    const orgPill = page.getByRole('link', {
      name: 'Clear organization filter',
    })
    await expect(orgPill).toBeVisible()
    await expect(orgPill).toContainText('Demo Organization')
  })

  test('When public org page opened, created date is shown', async ({
    page,
  }) => {
    await gotoStable(page, `/orgs/?slug=${testSlug}`)
    await expect(page.getByText('On AidNet since')).toBeVisible()
  })

  test('When invalid slug opened, Organization Not Found is shown', async ({
    page,
  }) => {
    await gotoStable(page, '/orgs/?slug=nonexistent-slug-12345')
    await expect(
      page.locator('h1:has-text("Organization Not Found")')
    ).toBeVisible()
  })

  test('When legacy /orgs/public?slug= link is opened, it forwards to the new landing', async ({
    page,
  }) => {
    await gotoStable(page, `/orgs/public/?slug=${testSlug}`)
    await expect(page.locator('h1')).toContainText('Demo Organization', {
      timeout: 10_000,
    })
  })
})
