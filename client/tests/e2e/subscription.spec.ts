import { test, expect } from '@playwright/test'

const ADMIN_PASSWORD = 'AdminPassword123!'
const ADMIN_EMAIL = `sub-admin-${Date.now()}@example.com`
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

async function createSystemAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/register/')
  await page.locator('#fullName').fill('Subscription Admin')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.locator('#confirmPassword').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

  const userId = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'))
    if (!key) throw new Error('No auth token key found')
    const stored = localStorage.getItem(key)
    if (!stored) throw new Error('No auth token stored')
    return JSON.parse(stored).user?.id
  })

  if (!userId) throw new Error('Could not extract user ID')

  const result = await page.evaluate(async ({ userId, SERVICE_KEY, SUPABASE_URL }) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_system_admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ p_user_id: userId }),
    })
    return { ok: res.ok, status: res.status, body: await res.text() }
  }, { userId, SERVICE_KEY, SUPABASE_URL })

  if (!result.ok) {
    throw new Error(`set_system_admin failed (${result.status}): ${result.body}`)
  }

  await page.reload()
  await page.waitForURL(/\/dashboard/)
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
}

test.describe.serial('Subscription Management', () => {
  test.beforeAll(async () => {
    test.skip(
      !SERVICE_KEY,
      'SUPABASE_SERVICE_ROLE_KEY not set — run against a local Supabase instance'
    )
  })

  test('When admin registers, system admin is provisioned', async ({ page }) => {
    await createSystemAdmin(page)
  })

  test('When system admin views /admin, Subscription Plans link is shown', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: 'Subscription Plans' })).toBeVisible({ timeout: 10000 })
  })

  test('When admin clicks Subscription Plans, navigates to /admin/plans', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Subscription Plans' }).click()
    await expect(page).toHaveURL(/\/admin\/plans/)
  })

  test('When admin opens /admin/plans, plans table renders with columns', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1:has-text("Subscription Plans")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('th:has-text("Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Monthly")')).toBeVisible()
    await expect(page.locator('th:has-text("Yearly")')).toBeVisible()
    await expect(page.locator('th:has-text("Features")')).toBeVisible()
  })

  test('When admin opens /admin/plans, Create Plan button is shown', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: 'Create Plan' })).toBeVisible({ timeout: 10000 })
  })

  test('When admin opens /admin/plans, seeded plans are listed', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await expect(page.locator('td:has-text("Free")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('td:has-text("Pro")')).toBeVisible()
    await expect(page.locator('td:has-text("Enterprise")')).toBeVisible()
  })

  test('When admin clicks Create Plan, form opens', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Create Plan' }).click()
    await expect(page.locator('h2:has-text("Create Plan")')).toBeVisible()
  })

  test('When admin views /admin, Organization Subscriptions link is shown', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: 'Organization Subscriptions' })).toBeVisible({ timeout: 10000 })
  })

  test('When admin clicks Organization Subscriptions, navigates to /admin/subscriptions', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Organization Subscriptions' }).click()
    await expect(page).toHaveURL(/\/admin\/subscriptions/)
  })

  test('When admin opens /admin/subscriptions, table with columns renders', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/subscriptions/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1:has-text("Organization Subscriptions")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('th:has-text("Organization")')).toBeVisible()
    await expect(page.locator('th:has-text("Plan")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
  })

  test('When admin opens /admin/subscriptions, shows rows or empty state', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/subscriptions/', { waitUntil: 'networkidle' })
    const hasData = await page.locator('table tbody tr').count()
    if (hasData > 0) {
      await expect(page.locator('table tbody tr').first()).toBeVisible()
    } else {
      await expect(page.locator('text=No subscriptions yet')).toBeVisible({ timeout: 10000 })
    }
  })
})
