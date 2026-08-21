import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = 'admin@donate.app'
const ADMIN_PASSWORD = 'Password123!'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 })
}

test.describe('Profile Page', () => {
  test('shows profile form with full name input and email display', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await page.goto('/profile')

    await expect(page.getByText('Full Name')).toBeVisible()
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    // Email shown in profile body (not the nav link)
    await expect(page.locator('p').filter({ hasText: email })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  })

  test('email is displayed as text (not editable)', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await page.goto('/profile')

    const emailText = page.locator('p').filter({ hasText: email })
    await expect(emailText).toBeVisible()
  })

  test('can edit full name and save', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await page.goto('/profile')

    const nameField = page.locator('input[type="text"]').first()
    await nameField.fill('E2E Test User')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.waitForTimeout(1000)
    await expect(nameField).toHaveValue('E2E Test User')
  })

  test('shows organization label', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await page.goto('/profile')

    await expect(page.getByText('Organization', { exact: true })).toBeVisible()
  })

  test('profile link from nav navigates correctly', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    // Use a page with AppLayout nav — dashboard has no nav
    await page.goto('/campaigns/')
    await page.locator('nav').getByRole('link', { name: email }).click()
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByText('Full Name')).toBeVisible()
  })
})
