import { test, expect } from '@playwright/test'

const TEST_EMAIL = `dash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
const TEST_PASSWORD = 'DashPassword123!'

test.describe('Dashboard', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Dashboard Test User')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create Account' }).click()
    // Registration must succeed and land on the dashboard; surface any failure
    // (including a parallel-worker collision) instead of silently continuing.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    await page.close()
  })

  test('When not authenticated, /dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard/')
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
  })

  test('When authenticated, dashboard shows welcome and heading', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
    await expect(page.locator(`text=Welcome back, ${TEST_EMAIL}!`)).toBeVisible()
  })

  test('When authenticated, dashboard shows org and profile links', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Manage Organizations →' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Update Profile →' })).toBeVisible()
  })

  test('When authenticated, dashboard shows card sections', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await expect(page.getByRole('heading', { name: 'My Organizations' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible()
  })

  test('When authenticated, dashboard shows Quick Stats section', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await expect(page.getByRole('heading', { name: 'Quick Stats' })).toBeVisible()
  })

  test('When authed user clicks their email in nav, navigates to profile', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Dashboard has no nav — use a page with AppLayout nav
    await page.goto('/campaigns/')
    await page.locator('nav').getByText(TEST_EMAIL).click()
    await expect(page).toHaveURL(/\/profile/)
  })

  test('When authed user clicks Sign out, redirected to login', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Dashboard has no nav — use a page with AppLayout nav
    await page.goto('/campaigns/')
    await page.locator('button', { hasText: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/auth\/login\//, { timeout: 10000 })
  })
})
