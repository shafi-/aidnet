import { test, expect } from '@playwright/test'
import { registerViaApi, signIn } from './lib/api'
import {
  expectConsoleSection,
  gotoStable,
  loginViaUi,
  openAdminSection,
  settleAfterLogin,
} from './lib/ui'

const SEEDED_ADMIN = { email: 'admin@donate.app', password: 'Password123!' }
const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await loginViaUi(page, SEEDED_ADMIN.email, SEEDED_ADMIN.password)
  await settleAfterLogin(page)
}

test.describe.serial('Subscription Management', () => {
  test('When system admin views /admin, the Plans section is in the console', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/')
    await expectConsoleSection(page, 'Admin navigation', 'Plans')
  })

  test('When admin opens the Plans section, navigates to /admin/plans', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/')
    await openAdminSection(page, 'Plans')
    await expect(page).toHaveURL(/\/admin\/plans/)
  })

  test('When admin opens /admin/plans, plans table renders with columns', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/plans/')
    await expect(page.locator('h1:has-text("Subscription Plans")')).toBeVisible(
      { timeout: 10000 }
    )
    await expect(page.locator('th:has-text("Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Monthly")')).toBeVisible()
    await expect(page.locator('th:has-text("Yearly")')).toBeVisible()
    await expect(page.locator('th:has-text("Features")')).toBeVisible()
  })

  test('When admin opens /admin/plans, Create Plan button is shown', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/plans/')
    await expect(page.getByRole('button', { name: 'Create Plan' })).toBeVisible(
      { timeout: 10000 }
    )
  })

  test('When admin opens /admin/plans, seeded plans are listed', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/plans/')
    await expect(page.locator('td:has-text("Free")')).toBeVisible()
    await expect(page.locator('td:has-text("Pro")')).toBeVisible()
    await expect(page.locator('td:has-text("Enterprise")')).toBeVisible()
  })

  test('When admin clicks Create Plan, form opens', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/plans/')
    await page.getByRole('button', { name: 'Create Plan' }).click()
    await expect(page.locator('h2:has-text("Create Plan")')).toBeVisible()
  })

  test('When admin views /admin, Subscriptions is in the console', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/')
    await expectConsoleSection(page, 'Admin navigation', 'Subscriptions')
  })

  test('When admin opens the Subscriptions section, navigates to /admin/subscriptions', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/')
    await openAdminSection(page, 'Subscriptions')
    await expect(page).toHaveURL(/\/admin\/subscriptions/)
  })

  test('When admin opens /admin/subscriptions, table with columns renders', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/subscriptions/')
    await expect(
      page.locator('h1:has-text("Organization Subscriptions")')
    ).toBeVisible()
    await expect(page.locator('th:has-text("Organization")')).toBeVisible()
    await expect(page.locator('th:has-text("Plan")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
  })

  test('When admin opens /admin/subscriptions, shows rows or empty state', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/subscriptions/')
    await expect(
      page
        .locator('table tbody tr')
        .first()
        .or(page.getByText('No subscriptions yet'))
    ).toBeVisible()
  })

  test('When system admin promotes another user, grant_system_admin works', async ({
    page,
    request,
  }) => {
    const email = `grant-target-${Date.now()}@example.com`
    const password = 'GrantTest123!'
    await registerViaApi(page, email, password, 'Grant Target User')

    const userSession = await signIn(request, email, password)
    const profileRes = await request.post(
      `${API_URL}/rest/v1/rpc/get_my_profile`,
      {
        data: {},
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${userSession.access_token}`,
        },
      }
    )
    const profile = await profileRes.json()
    const targetUserId = Array.isArray(profile) ? profile[0].id : profile.id

    const adminSession = await signIn(
      request,
      SEEDED_ADMIN.email,
      SEEDED_ADMIN.password
    )
    const grantRes = await request.post(
      `${API_URL}/rest/v1/rpc/grant_system_admin`,
      {
        data: { target_user_id: targetUserId },
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${adminSession.access_token}`,
        },
      }
    )
    expect(grantRes.ok()).toBeTruthy()
    expect(await grantRes.json()).toBe(true)

    await loginViaUi(page, email, password)

    await gotoStable(page, '/admin/')
    await expect(page.locator('h1')).toContainText('System Admin')
  })
})
