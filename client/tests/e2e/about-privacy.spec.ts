import { test, expect } from '@playwright/test'

test.describe('About Page', () => {
  test('When anon loads /about, heading and content render', async ({
    page,
  }) => {
    await page.goto('/about/')
    await expect(
      page.getByRole('heading', { name: 'About Donate' })
    ).toBeVisible()
    await expect(
      page.getByText(
        'A donation platform that connects donors with organizations running campaigns for causes that matter.'
      )
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'How It Works' })
    ).toBeVisible()
    await expect(
      page.getByText(
        'Organizations request to join and are reviewed by administrators'
      )
    ).toBeVisible()
  })
})

test.describe('Privacy Page', () => {
  test('When anon loads /privacy, policy sections render', async ({ page }) => {
    await page.goto('/privacy/')
    await expect(
      page.getByRole('heading', { name: 'Privacy Policy' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Data We Collect' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'How We Use Your Data' })
    ).toBeVisible()
  })
})
