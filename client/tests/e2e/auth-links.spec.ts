import { test, expect } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'test@example.com'
const password = process.env.E2E_PASSWORD ?? 'Password123!'

test.describe('Auth Links', () => {
  test('login page has Forgot password? link that navigates to reset password', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/auth\/reset-password/)
  })

  test('register page has sign in link', async ({ page }) => {
    await page.goto('/auth/register')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('login page has register link', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/auth\/register/)
  })

  test('landing page authenticated nav shows Dashboard and Profile links', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')

    await page.goto('/auth/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 })

    await page.goto('/')
    // Landing page authenticated nav shows Dashboard and Profile links
    await expect(page.locator('nav').getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.locator('nav').getByRole('link', { name: 'Profile' })).toBeVisible()
  })
})
