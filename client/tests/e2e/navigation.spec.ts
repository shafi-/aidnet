import { test, expect } from '@playwright/test'
// Clicking a Next Link mid-hydration can swallow the navigation (flaked in
// WebKit): wait out the initial JS work before clicking footer links.
async function waitStable(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
}

test.describe('Navigation', () => {
  // Page-render assertions for /about, /privacy, /terms and /contact live in
  // about-privacy.spec.ts — their owning spec. This file owns navigation
  // behavior: the footer links and 404 handling.

  test.describe('Footer', () => {
    // Every test waits for org-provider readiness: clicking a Next Link
    // mid-hydration can swallow the navigation (seen flaking in WebKit).
    test('When anon clicks the footer About link, about page renders', async ({
      page,
    }) => {
      await page.goto('/')
      await waitStable(page)
      await page
        .getByRole('navigation', { name: 'Footer' })
        .getByRole('link', { name: 'About Us' })
        .click()
      await expect(page).toHaveURL(/\/about\/$/)
      await expect(page.locator('h1')).toContainText('About AidNet')
    })

    test('When anon clicks the footer Privacy link, privacy page renders', async ({
      page,
    }) => {
      await page.goto('/')
      await waitStable(page)
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
      await waitStable(page)
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
      await waitStable(page)
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
