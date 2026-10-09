import { test, expect } from '@playwright/test'
import { gotoStable, loginViaUi } from './lib/ui'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }

test.describe('Responsive Design', () => {
  test.describe('Mobile Layout', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('When mobile viewport, landing page renders', async ({ page }) => {
      await gotoStable(page, '/')
      await expect(page.locator('h1')).toContainText('AidNet')
      await expect(
        page.getByRole('heading', { name: 'Welcome to AidNet' })
      ).toBeVisible()
    })

    test('When mobile viewport, auth login page renders', async ({ page }) => {
      await gotoStable(page, '/auth/login/')
      await expect(page.locator('h1')).toContainText('Sign In')
      await expect(page.locator('#email')).toBeVisible()
    })

    test('When mobile viewport, register page renders', async ({ page }) => {
      await gotoStable(page, '/auth/register/')
      await expect(page.locator('h1')).toContainText('Create Account')
      await expect(page.locator('#email')).toBeVisible()
    })
  })

  test.describe('Desktop Layout', () => {
    test.use({ viewport: { width: 1920, height: 1080 } })

    test('When desktop viewport, landing shows 3 feature cards', async ({
      page,
    }) => {
      await gotoStable(page, '/')
      await expect(page.locator('h1')).toContainText('AidNet')
      // Scope by content: the "how giving works" grid shares the same
      // md:grid-cols-3 classes, and the latest-campaigns grid is kept
      // populated by the seed.
      const grid = page.locator('div.grid', {
        has: page.getByRole('heading', { name: 'Trusted Organizations' }),
      })
      await expect(grid.locator(':scope > div')).toHaveCount(3)
    })

    test('When desktop viewport and authed, the console sidebar renders', async ({
      page,
    }) => {
      await loginViaUi(page, OWNER.email, OWNER.password)

      const sidebar = page.getByRole('navigation', {
        name: 'Workspace navigation',
      })
      await expect(sidebar).toBeVisible()
      await expect(
        sidebar.getByRole('link', { name: 'Overview' })
      ).toBeVisible()
      await expect(page.locator('[data-org-switcher]:visible')).toBeVisible()
    })
  })

  test.describe('Console on Mobile', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('When mobile viewport and authed, the org chip stays visible and the drawer opens', async ({
      page,
    }) => {
      await loginViaUi(page, OWNER.email, OWNER.password)

      // The org switcher collapses to a chip pinned in the top bar.
      await expect(page.locator('[data-org-switcher]:visible')).toBeVisible()
      await expect(
        page.getByRole('navigation', { name: 'Workspace navigation' })
      ).toBeHidden()

      await page.getByRole('button', { name: 'Open menu' }).click()
      const drawer = page.getByRole('dialog', { name: 'Open menu' })
      await expect(drawer.getByRole('link', { name: 'Overview' })).toBeVisible()
      await expect(
        drawer.getByRole('link', { name: 'Campaigns', exact: true })
      ).toBeVisible()
    })
  })
})
