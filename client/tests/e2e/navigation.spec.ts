import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.describe('Public Navigation', () => {
    test('When anon loads landing, nav shows brand and auth links', async ({ page }) => {
      await page.goto('/')
      const nav = page.locator('nav')
      await expect(nav.locator('h1')).toContainText('SupaNext')
      await expect(nav.getByRole('link', { name: 'Sign In' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Get Started' })).toBeVisible()
    })

    test('When user clicks Sign up on login, navigates to register', async ({ page }) => {
      await page.goto('/auth/login/')
      await page.getByRole('link', { name: 'Sign up' }).click()
      await expect(page).toHaveURL(/\/auth\/register/)
    })

    test('When user clicks Sign in on register, navigates to login', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.getByRole('link', { name: 'Sign in' }).click()
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('When user clicks Back to home on auth pages, navigates to /', async ({ page }) => {
      await page.goto('/auth/login/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')

      await page.goto('/auth/register/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Static Pages', () => {
    test('When anon loads /about, about content renders', async ({ page }) => {
      await page.goto('/about/')
      await expect(page.locator('h1')).toContainText('About SupaNext')
      await expect(page.locator('text=NextJS + Supabase starter template')).toBeVisible()
    })

    test('When anon loads /privacy, privacy policy renders', async ({ page }) => {
      await page.goto('/privacy/')
      await expect(page.locator('h1')).toContainText('Privacy Policy')
    })
  })

  test.describe('404 Handling', () => {
    test('When anon opens nonexistent route, 404 is returned', async ({ page }) => {
      const response = await page.goto('/nonexistent-page/')
      expect(response?.status()).toBe(404)
    })
  })
})
