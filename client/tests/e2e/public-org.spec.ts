import { test, expect } from '@playwright/test'
import { gotoStable } from './lib/ui'

test.describe.serial('Public Org Page', () => {
  test.beforeAll(async () => {
    test.skip(
      !process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL not set — run against a local Supabase instance'
    )
  })

  // Use the seeded demo org — no signup or trigger dependency needed.
  const testSlug = 'demo-org'

  test('When valid slug opened, public org page shows org info', async ({
    page,
  }) => {
    await gotoStable(page, `/orgs/public/?slug=${testSlug}`)
    await expect(page.locator('h1')).toContainText('Demo Organization')
    await expect(
      page.getByText('Organization for testing and demonstration purposes')
    ).toBeVisible()
  })

  test('When public org page opened, Sign In and Create Account links are shown', async ({
    page,
  }) => {
    await gotoStable(page, `/orgs/public/?slug=${testSlug}`)
    await expect(
      page.locator('main').getByRole('link', { name: 'Sign In' })
    ).toBeVisible()
    await expect(
      page.locator('main').getByRole('link', { name: 'Create Account' })
    ).toBeVisible()
  })

  test('When public org page opened, created date is shown', async ({
    page,
  }) => {
    await gotoStable(page, `/orgs/public/?slug=${testSlug}`)
    await expect(page.getByText('On AidNet since')).toBeVisible()
  })

  test('When invalid slug opened, Organization Not Found is shown', async ({
    page,
  }) => {
    await gotoStable(page, '/orgs/public/?slug=nonexistent-slug-12345')
    await expect(
      page.locator('h1:has-text("Organization Not Found")')
    ).toBeVisible()
  })

  test('When empty slug opened, Organization Not Found is shown', async ({
    page,
  }) => {
    await gotoStable(page, '/orgs/public/')
    await expect(
      page.locator('h1:has-text("Organization Not Found")')
    ).toBeVisible()
  })
})
