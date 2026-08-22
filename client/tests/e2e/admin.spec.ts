import { test, expect } from '@playwright/test'

const ADMIN_PASSWORD = 'AdminPassword123!'
const ADMIN_EMAIL = `admin-e2e-${Date.now()}@example.com`
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

async function setupSystemAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/register/')
  await page.locator('#fullName').fill('System Admin')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.locator('#confirmPassword').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

  const token = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'))
    if (!key) throw new Error('No auth token key found')
    const stored = localStorage.getItem(key)
    if (!stored) throw new Error('No auth token stored')
    return JSON.parse(stored).access_token
  })

  await page.evaluate(async ({ token, SUPABASE_URL, ANON_KEY }) => {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/bootstrap_system_admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': ANON_KEY,
      },
    })
  }, { token, SUPABASE_URL, ANON_KEY })
}

test.describe.serial('Admin Pages', () => {
  test('When system admin loads /admin, system stats are shown', async ({ page }) => {
    await setupSystemAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })

    await expect(page.locator('h1')).toContainText('System Admin')
    await expect(page.locator('text=Organizations').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Users').first()).toBeVisible()
    await expect(page.locator('text=Members').first()).toBeVisible()
    await expect(page.locator('text=Recent Signups')).toBeVisible()
  })

  test('When system admin views /admin, Manage Organizations link is shown', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('System Admin')
    await expect(page.getByRole('link', { name: 'Manage Organizations' })).toBeVisible({ timeout: 10000 })
  })

  test('When admin clicks Manage Organizations, navigates to /admin/orgs', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('System Admin')
    await page.getByRole('link', { name: 'Manage Organizations' }).click()
    await expect(page).toHaveURL(/\/admin\/orgs/)
  })

  test('When system admin loads /admin/orgs, organizations table renders', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/admin/orgs/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('System Admin')
    await expect(page.locator('th:has-text("Name")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('th:has-text("Slug")')).toBeVisible()
    await expect(page.locator('th:has-text("Members")')).toBeVisible()
  })
})
