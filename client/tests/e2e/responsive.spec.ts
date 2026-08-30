import { test, expect } from '@playwright/test'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }

test.describe('Responsive Design', () => {
  test.describe('Mobile Layout', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('When mobile viewport, landing page renders', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('h1')).toContainText('SupaNext')
      await expect(
        page.getByRole('heading', { name: 'Welcome to SupaNext' })
      ).toBeVisible()
    })

    test('When mobile viewport, auth login page renders', async ({ page }) => {
      await page.goto('/auth/login/')
      await expect(page.locator('h1')).toContainText('Sign In')
      await expect(page.locator('#email')).toBeVisible()
    })

    test('When mobile viewport, register page renders', async ({ page }) => {
      await page.goto('/auth/register/')
      await expect(page.locator('h1')).toContainText('Create Account')
      await expect(page.locator('#email')).toBeVisible()
    })
  })

  test.describe('Desktop Layout', () => {
    test.use({ viewport: { width: 1920, height: 1080 } })

    test('When desktop viewport, landing shows 3 feature cards', async ({
      page,
    }) => {
      await page.goto('/')
      await expect(page.locator('h1')).toContainText('SupaNext')
      const cards = page.locator('.grid > div')
      await expect(cards).toHaveCount(3)
    })

    test('When desktop viewport and authed, dashboard renders', async ({
      page,
    }) => {
      await page.goto('/auth/login/')
      await page.locator('#email').fill(OWNER.email)
      await page.locator('#password').fill(OWNER.password)
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page).toHaveURL(/\/dashboard/)

      await expect(page.locator('text=My Organizations')).toBeVisible()
      await expect(page.locator('text=Profile Settings')).toBeVisible()
      await expect(
        page.getByRole('heading', { name: 'Security' })
      ).toBeVisible()
    })
  })
})
