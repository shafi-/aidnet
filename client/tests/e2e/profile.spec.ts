import { test, expect } from '@playwright/test'
import { USERS, signIn, getMyProfile, SUPABASE_URL } from './lib/api'

const ADMIN_STATE = 'tests/e2e/.auth/systemAdmin.json'
const ADMIN_EMAIL = 'admin@donate.app'

test.use({ storageState: ADMIN_STATE })

test.describe('Profile Page', () => {
  test('When admin opens profile, form shows name input and email', async ({ page }) => {
    await page.goto('/profile')

    await expect(page.getByText('Full Name')).toBeVisible()
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    // Email shown in profile body (not the nav link)
    await expect(page.locator('p').filter({ hasText: ADMIN_EMAIL })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  })

  test('When admin opens profile, email shown matches the profile API', async ({ page }) => {
    await page.goto('/profile')

    const emailText = page.locator('p').filter({ hasText: ADMIN_EMAIL })
    await expect(emailText).toBeVisible()

    // API contract: the profile RPC must return the same email the page shows.
    test.skip(!SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL not set — skipping API check')
    const session = await signIn(
      page.request,
      USERS.systemAdmin.email,
      USERS.systemAdmin.password
    )
    const profile = await getMyProfile(page.request, session)
    expect(profile.email).toBe(USERS.systemAdmin.email)
  })

  test('When user edits full name and saves, change persists', async ({ page }) => {
    await page.goto('/profile')

    const nameField = page.locator('input[type="text"]').first()
    const original = await nameField.inputValue()
    const updated = `E2E Test User ${Date.now()}`

    await nameField.fill(updated)
    await page.getByRole('button', { name: 'Save' }).click()

    // Reload to prove the value was persisted, not just held in the input.
    await page.reload()
    await expect(page.locator('input[type="text"]').first()).toHaveValue(updated)

    // Restore original so the seeded admin profile stays stable across runs.
    await page.locator('input[type="text"]').first().fill(original)
    await page.getByRole('button', { name: 'Save' }).click()
  })

  test('When admin opens profile, organization label is shown', async ({ page }) => {
    await page.goto('/profile')

    await expect(page.getByText('Organization', { exact: true })).toBeVisible()
  })

  test('When authed user clicks email in nav, navigates to profile', async ({ page }) => {
    // Use a page with AppLayout nav — dashboard has no nav
    await page.goto('/campaigns/')
    await page.locator('nav').getByRole('link', { name: ADMIN_EMAIL }).click()
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByText('Full Name')).toBeVisible()
  })
})
