import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.describe('Static Pages', () => {
    test('When anon loads /about, about content renders', async ({ page }) => {
      await page.goto('/about/')
      await expect(page.locator('h1')).toContainText('About Donate')
      await expect(
        page.locator(
          'text=A donation platform that connects donors with organizations running campaigns for causes that matter.'
        )
      ).toBeVisible()
    })

    test('When anon loads /privacy, privacy policy renders', async ({
      page,
    }) => {
      await page.goto('/privacy/')
      await expect(page.locator('h1')).toContainText('Privacy Policy')
    })
  })

  test.describe('404 Handling', () => {
    test('When anon opens nonexistent route, 404 is returned', async ({
      page,
    }) => {
      const response = await page.goto('/nonexistent-page/')
      expect(response?.status()).toBe(404)
    })
  })
})
