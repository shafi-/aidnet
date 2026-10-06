import { test, expect } from '@playwright/test'
import { USERS, signIn, getMyProfile, SUPABASE_URL } from './lib/api'
import { openNavMenu, orgReady } from './lib/ui'

const ADMIN_EMAIL = 'admin@donate.app'

// Log in via UI instead of storageState: other specs sign the admin in
// elsewhere, and GoTrue refresh-token rotation can invalidate a captured
// session file mid-suite.
async function loginAsSeededAdmin(
  page: import('@playwright/test').Page
): Promise<void> {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill('Password123!')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeededAdmin(page)
  })

  test('When admin opens profile, form shows name input and email', async ({
    page,
  }) => {
    await page.goto('/profile')

    await expect(page.getByText('Full Name')).toBeVisible()
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    // Email shown in profile body (not the nav link)
    await expect(
      page.locator('p').filter({ hasText: ADMIN_EMAIL })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  })

  test('When admin opens profile, email shown matches the profile API', async ({
    page,
  }) => {
    await page.goto('/profile')

    const emailText = page.locator('p').filter({ hasText: ADMIN_EMAIL })
    await expect(emailText).toBeVisible()

    // API contract: the profile RPC must return the same email the page shows.
    test.skip(
      !SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL not set — skipping API check'
    )
    const session = await signIn(
      page.request,
      USERS.systemAdmin.email,
      USERS.systemAdmin.password
    )
    const profile = await getMyProfile(page.request, session)
    expect(profile.email).toBe(USERS.systemAdmin.email)
  })

  test('When user edits full name and saves, change persists', async ({
    page,
  }) => {
    await page.goto('/profile')
    // Fill must land after hydration: a pre-hydration fill is wiped when
    // React mounts the controlled input (slowest on WebKit engines).
    await orgReady(page)

    // Target the Full Name field via its label (input[type=text].first()
    // is order-fragile if other text inputs appear on the page)
    const nameField = page.getByLabel('Full Name')
    const original = await nameField.inputValue()
    const updated = `E2E Test User ${Date.now()}`

    await nameField.fill(updated)
    await page.getByRole('button', { name: 'Save' }).click()
    // Wait for the save RPC to land — reloading mid-flight loses the write
    // (races on slower engines).
    await expect(page.getByText('Profile saved.')).toBeVisible()

    // Reload to prove the value was persisted, not just held in the input.
    await page.reload()
    await expect(page.getByLabel('Full Name')).toHaveValue(updated)

    // Restore original so the seeded admin profile stays stable across runs.
    await page.getByLabel('Full Name').fill(original)
    await page.getByRole('button', { name: 'Save' }).click()
  })

  test('When admin opens profile, organization label is shown', async ({
    page,
  }) => {
    await page.goto('/profile')

    await expect(page.getByText('Organization', { exact: true })).toBeVisible()
  })

  test('When authed user clicks email in nav, navigates to profile', async ({
    page,
  }) => {
    // Use a page with AppLayout nav — dashboard has no nav
    await page.goto('/campaigns/')
    await openNavMenu(page)
    // Desktop: link labelled "Profile"; mobile: drawer link "Profile <email>"
    await page
      .locator('nav')
      .getByRole('link', { name: /Profile/ })
      .click()
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByText('Full Name')).toBeVisible()
  })
})
