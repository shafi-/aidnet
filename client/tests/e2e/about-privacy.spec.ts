import { test, expect } from '@playwright/test'

test.describe('About Page', () => {
  test('When anon loads /about, mission and how-it-works render', async ({
    page,
  }) => {
    await page.goto('/about/')
    await expect(
      page.getByRole('heading', { name: 'About AidNet' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Our Mission' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'How It Works' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Why You Can Trust Us' })
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
      page.getByRole('heading', { name: 'We Do Not Sell Your Data' })
    ).toBeVisible()
  })
})

test.describe('Terms Page', () => {
  test('When anon loads /terms, terms sections render', async ({ page }) => {
    await page.goto('/terms/')
    await expect(
      page.getByRole('heading', { name: 'Terms of Service' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: '4. Donations' })
    ).toBeVisible()
  })
})

test.describe('Contact Page', () => {
  test('When anon loads /contact, email contact renders', async ({ page }) => {
    await page.goto('/contact/')
    await expect(
      page.getByRole('heading', { name: 'Contact', exact: true })
    ).toBeVisible()
    await expect(page.locator('a[href^="mailto:"]')).toBeVisible()
  })
})
