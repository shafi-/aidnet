import { test, expect } from '@playwright/test'

const ADMIN_STATE = 'tests/e2e/.auth/systemAdmin.json'

test.use({ storageState: ADMIN_STATE })

test.describe('Auth Links', () => {
  test('When user clicks Forgot password?, navigates to reset-password', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/auth\/reset-password/)
  })

  test('When register page user clicks sign in, navigates to login', async ({ page }) => {
    await page.goto('/auth/register')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('When login page user clicks sign up, navigates to register', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/auth\/register/)
  })

  test('When authenticated, landing nav shows Dashboard and Profile links', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('nav').getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.locator('nav').getByRole('link', { name: 'Profile' })).toBeVisible()
  })
})
