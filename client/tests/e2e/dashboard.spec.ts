import { test, expect } from '@playwright/test'
import { openAccountMenu, openNavMenu } from './lib/ui'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }

async function loginAsOwner(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(OWNER.email)
  await page.locator('#password').fill(OWNER.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test.describe('Dashboard', () => {
  test('When not authenticated, /dashboard redirects to login', async ({
    page,
  }) => {
    await page.goto('/dashboard/')
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

  test('When authenticated, the console sidebar replaces the old card stack', async ({
    page,
  }) => {
    await loginAsOwner(page)

    const sidebar = page.getByRole('navigation', {
      name: 'Workspace navigation',
    })
    await expect(sidebar.getByRole('link', { name: 'Overview' })).toBeVisible()
    await expect(
      sidebar.getByRole('link', { name: 'Campaigns', exact: true })
    ).toBeVisible()
    // Owner-only section is present; the org switcher is pinned above it.
    await expect(sidebar.getByRole('link', { name: 'Billing' })).toBeVisible()
    await expect(page.locator('[data-org-switcher]')).toBeVisible()

    // The old trivia cards are gone for good.
    await expect(page.getByText('Welcome back!')).toHaveCount(0)
    await expect(page.getByText('My Organizations')).toHaveCount(0)
    await expect(page.getByText('Quick Stats')).toHaveCount(0)
  })

  test('When the owner opens Billing from the sidebar, the billing page renders', async ({
    page,
  }) => {
    await loginAsOwner(page)
    await page
      .getByRole('navigation', { name: 'Workspace navigation' })
      .getByRole('link', { name: 'Billing' })
      .click()
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
    await page.goto('/campaigns/')
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

    await page.goto('/campaigns/')
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
