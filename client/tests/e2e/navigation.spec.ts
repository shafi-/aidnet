import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.describe('Static Pages', () => {
    test('When anon loads /about, about content renders', async ({ page }) => {
      await page.goto('/about/')
      await expect(page.locator('h1')).toContainText('About Donate')
      await expect(
        page.getByRole('heading', { name: 'Our Mission' })
      ).toBeVisible()
    })

    test('When anon loads /privacy, privacy policy renders', async ({
      page,
    }) => {
      await page.goto('/privacy/')
      await expect(page.locator('h1')).toContainText('Privacy Policy')
      await expect(
        page.getByRole('heading', { name: 'We Do Not Sell Your Data' })
      ).toBeVisible()
    })

    test('When anon loads /terms, terms of service renders', async ({
      page,
    }) => {
      await page.goto('/terms/')
      await expect(page.locator('h1')).toContainText('Terms of Service')
    })

    test('When anon loads /contact, contact page renders', async ({ page }) => {
      await page.goto('/contact/')
      await expect(page.locator('h1')).toContainText('Contact')
      await expect(page.locator('a[href^="mailto:"]')).toBeVisible()
    })
  })

  test.describe('Footer', () => {
    test('When anon clicks the footer About link, about page renders', async ({
      page,
    }) => {
      await page.goto('/')
      await page
        .getByRole('navigation', { name: 'Footer' })
        .getByRole('link', { name: 'About Us' })
        .click()
      await expect(page).toHaveURL(/\/about\/$/)
      await expect(page.locator('h1')).toContainText('About Donate')
    })

    test('When anon clicks the footer Privacy link, privacy page renders', async ({
      page,
    }) => {
      await page.goto('/')
      await page
        .getByRole('navigation', { name: 'Footer' })
        .getByRole('link', { name: 'Privacy Policy' })
        .click()
      await expect(page).toHaveURL(/\/privacy\/$/)
      await expect(page.locator('h1')).toContainText('Privacy Policy')
    })

    test('When anon clicks the footer Terms link, terms page renders', async ({
      page,
    }) => {
      await page.goto('/')
      await page
        .getByRole('navigation', { name: 'Footer' })
        .getByRole('link', { name: 'Terms of Service' })
        .click()
      await expect(page).toHaveURL(/\/terms\/$/)
      await expect(page.locator('h1')).toContainText('Terms of Service')
    })

    test('When anon clicks the footer Contact link, contact page renders', async ({
      page,
    }) => {
      await page.goto('/')
      await page
        .getByRole('navigation', { name: 'Footer' })
        .getByRole('link', { name: 'Contact' })
        .click()
      await expect(page).toHaveURL(/\/contact\/$/)
      await expect(page.locator('h1')).toContainText('Contact')
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
