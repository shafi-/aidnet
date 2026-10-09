import { test, expect } from '@playwright/test'
import {
  expectConsoleSection,
  gotoStable,
  loginViaUi,
  openAccountMenu,
  openConsoleSection,
  openNavMenu,
} from './lib/ui'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }

async function loginAsOwner(page: import('@playwright/test').Page) {
  await loginViaUi(page, OWNER.email, OWNER.password)
}

test.describe('Dashboard', () => {
  test('When not authenticated, /dashboard redirects to login', async ({
    page,
  }) => {
    await gotoStable(page, '/dashboard/')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('When authenticated, the overview leads with stats and the attention queue', async ({
    page,
  }) => {
    await loginAsOwner(page)

    await expect(
      page.getByRole('heading', { name: 'Overview', exact: true })
    ).toBeVisible()
    // The numbers an operator needs — not a welcome banner.
    await expect(page.getByText('Raised total')).toBeVisible()
    await expect(page.getByText('Live campaigns')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Needs your confirmation' })
    ).toBeVisible()
  })

  test('When authenticated, the console replaces the old card stack', async ({
    page,
  }) => {
    await loginAsOwner(page)

    // Sections live in the sidebar (desktop) or the drawer (mobile).
    await expectConsoleSection(page, 'Workspace navigation', 'Overview')
    await expectConsoleSection(page, 'Workspace navigation', 'Campaigns')
    // Owner-only section is present; the org switcher is pinned above it
    // (sidebar block on desktop, top-bar chip on mobile).
    await expectConsoleSection(page, 'Workspace navigation', 'Billing')
    await expect(page.locator('[data-org-switcher]:visible')).toBeVisible()

    // The old trivia cards are gone for good.
    await expect(page.getByText('Welcome back!')).toHaveCount(0)
    await expect(page.getByText('My Organizations')).toHaveCount(0)
    await expect(page.getByText('Quick Stats')).toHaveCount(0)
  })

  test('When the owner opens Billing from the console, the billing page renders', async ({
    page,
  }) => {
    await loginAsOwner(page)
    await openConsoleSection(page, 'Workspace navigation', 'Billing')
    await expect(page).toHaveURL(/\/dashboard\/billing\/?$/)
    await expect(
      page.getByRole('heading', { name: 'Billing', exact: true })
    ).toBeVisible()
  })

  test('When authed user clicks their email in nav, navigates to profile', async ({
    page,
  }) => {
    await loginAsOwner(page)

    // Console pages carry the sidebar; the account menu lives on the
    // public shell — go there for the account-menu journey.
    await gotoStable(page, '/campaigns/')
    await openNavMenu(page)
    // Desktop: account dropdown renders Profile as a Radix menuitem
    // (openAccountMenu opens it); mobile: drawer link "Profile <email>".
    await openAccountMenu(page)
    await page
      .locator('nav')
      .getByRole('menuitem', { name: /Profile/ })
      .or(page.locator('nav').getByRole('link', { name: /Profile/ }))
      .click()
    await expect(page).toHaveURL(/\/profile/)
  })

  test('When authed user clicks Sign out, redirected to login', async ({
    page,
  }) => {
    await loginAsOwner(page)

    await gotoStable(page, '/campaigns/')
    await openNavMenu(page)
    await openAccountMenu(page)
    // Desktop dropdown renders a Radix menuitem; mobile drawer a button.
    await page
      .getByRole('menuitem', { name: 'Sign out' })
      .or(page.getByRole('button', { name: 'Sign out' }))
      .click()
    await expect(page).toHaveURL(/\/auth\/login\//)
  })
})
