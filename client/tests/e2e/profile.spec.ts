import { test, expect } from '@playwright/test'
import { USERS, signIn, getMyProfile, SUPABASE_URL } from './lib/api'
import {
  gotoStable,
  loginViaUi,
  openAccountMenu,
  openNavMenu,
  orgReady,
} from './lib/ui'

const ADMIN_EMAIL = 'admin@donate.app'

// Log in via UI instead of storageState: other specs sign the admin in
// elsewhere, and GoTrue refresh-token rotation can invalidate a captured
// session file mid-suite.
async function loginAsSeededAdmin(
  page: import('@playwright/test').Page
): Promise<void> {
  await loginViaUi(page, ADMIN_EMAIL, 'Password123!')
}

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeededAdmin(page)
  })

  test('When admin opens profile, form shows name input and email', async ({
    page,
  }) => {
    await gotoStable(page, '/profile')

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
    await gotoStable(page, '/profile')

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
    await gotoStable(page, '/profile')
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
    // The field refills from the profile RPC after the reload — on slow
    // engines that lands well past the 5s expect default.
    await page.reload()
    await expect(page.getByLabel('Full Name')).toHaveValue(updated, {
      timeout: 15000,
    })

    // Restore original so the seeded admin profile stays stable across runs.
    await page.getByLabel('Full Name').fill(original)
    await page.getByRole('button', { name: 'Save' }).click()
  })

  test('When admin opens profile, organization label is shown', async ({
    page,
  }) => {
    await gotoStable(page, '/profile')

    await expect(page.getByText('Organization', { exact: true })).toBeVisible()
  })

  test('When authed user clicks email in nav, navigates to profile', async ({
    page,
  }) => {
    // Use a page with AppLayout nav — dashboard has no nav
    await gotoStable(page, '/campaigns/')
    await openNavMenu(page)
    await openAccountMenu(page)
    // Desktop: Radix menuitem in the account dropdown; mobile: drawer
    // link "Profile <email>".
    await page
      .locator('nav')
      .getByRole('menuitem', { name: /Profile/ })
      .or(page.locator('nav').getByRole('link', { name: /Profile/ }))
      .click()
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByText('Full Name')).toBeVisible()
  })
})
