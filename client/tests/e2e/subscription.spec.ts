import { test, expect } from '@playwright/test'
import { registerViaApi, signIn } from './lib/api'

const SEEDED_ADMIN = { email: 'admin@donate.app', password: 'Password123!' }
const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(SEEDED_ADMIN.email)
  await page.locator('#password').fill(SEEDED_ADMIN.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test.describe.serial('Subscription Management', () => {
  test('When system admin views /admin, Subscription Plans link is shown', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(
      page.getByRole('link', { name: 'Subscription Plans' })
    ).toBeVisible()
  })

  test('When admin clicks Subscription Plans, navigates to /admin/plans', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Subscription Plans' }).click()
    await expect(page).toHaveURL(/\/admin\/plans/)
  })

  test('When admin opens /admin/plans, plans table renders with columns', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
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
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: 'Create Plan' })).toBeVisible(
      { timeout: 10000 }
    )
  })

  test('When admin opens /admin/plans, seeded plans are listed', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await expect(page.locator('td:has-text("Free")')).toBeVisible()
    await expect(page.locator('td:has-text("Pro")')).toBeVisible()
    await expect(page.locator('td:has-text("Enterprise")')).toBeVisible()
  })

  test('When admin clicks Create Plan, form opens', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Create Plan' }).click()
    await expect(page.locator('h2:has-text("Create Plan")')).toBeVisible()
  })

  test('When admin views /admin, Organization Subscriptions link is shown', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(
      page.getByRole('link', { name: 'Organization Subscriptions' })
    ).toBeVisible()
  })

  test('When admin clicks Organization Subscriptions, navigates to /admin/subscriptions', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Organization Subscriptions' }).click()
    await expect(page).toHaveURL(/\/admin\/subscriptions/)
  })

  test('When admin opens /admin/subscriptions, table with columns renders', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/subscriptions/', { waitUntil: 'networkidle' })
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
    await page.goto('/admin/subscriptions/', { waitUntil: 'networkidle' })
    const hasData = await page.locator('table tbody tr').count()
    if (hasData > 0) {
      await expect(page.locator('table tbody tr').first()).toBeVisible()
    } else {
      await expect(page.locator('text=No subscriptions yet')).toBeVisible()
    }
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

    await page.goto('/auth/login/')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('System Admin')
  })
})
