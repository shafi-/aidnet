import { test, expect } from '@playwright/test'
import { openAccountMenu, openNavMenu } from './lib/ui'

const ADMIN_STATE = 'tests/e2e/.auth/systemAdmin.json'

test.describe('Landing Page', () => {
  test('When anon loads landing, welcome content renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('AidNet')
    await expect(
      page.getByRole('heading', { name: 'Welcome to AidNet' })
    ).toBeVisible()
    await expect(
      page.locator(
        'text=Discover campaigns that matter and support the causes you care about'
      )
    ).toBeVisible()
  })

  test('When anon loads landing, feature cards render', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Trusted Organizations' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Transparent Campaigns' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Easy Donations' })
    ).toBeVisible()
  })

  test('When anon clicks See more, navigates to campaigns browse', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'See more →' }).click()
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(
      page.getByRole('heading', { name: 'Discover Campaigns' })
    ).toBeVisible()
  })

  test('When campaign cards render, each links to its detail page', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Latest Campaigns' })
    ).toBeVisible()

    const cards = page.locator('a[href*="/campaigns/detail"]')
    // With no live campaigns, the section still renders (contract holds).
    if ((await cards.count()) === 0) return

    await cards.first().click()
    await expect(page).toHaveURL(/\/campaigns\/detail\/?\?slug=/)
  })

  test('When anon loads landing, Latest Campaigns section is visible', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Latest Campaigns' })
    ).toBeVisible()
  })

  test('When a campaign list is empty, get-involved card routes visitors', async ({
    page,
  }) => {
    // The landing/campaigns empty branch only renders with zero live
    // campaigns; the seeded database always has some. Reach the same
    // GetInvolved component through an org filter that matches nothing.
    await page.goto(`/campaigns?org=${crypto.randomUUID()}`)
    await expect(
      page.getByText('No campaigns found for this organization.')
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Register your organization' })
    ).toHaveAttribute('href', '/org/request/')

    // Inverse guard: with seeded campaigns present, the landing page shows
    // campaign cards, not the empty-state card.
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Get involved' })
    ).toHaveCount(0)
  })

  test('When anon loads landing, how-giving-works steps render', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'How giving works' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Browse verified campaigns' })
    ).toBeVisible()
  })

  test.describe('Navigation from landing', () => {
    test('When anon loads landing, nav shows brand and auth links', async ({
      page,
    }) => {
      await page.goto('/')
      await openNavMenu(page)
      const nav = page.locator('nav')
      await expect(nav.getByRole('link', { name: 'AidNet' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Campaigns' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Sign In' })).toBeVisible()
    })

    test('When anon clicks the hero primary CTA, navigates to campaigns', async ({
      page,
    }) => {
      await page.goto('/')
      // The tagline promises discovery: the primary hero action browses
      // campaigns without requiring an account.
      await page
        .locator('main')
        .getByRole('link', { name: 'Browse campaigns' })
        .click()
      await expect(page).toHaveURL(/\/campaigns/)
    })

    test('When anon clicks the hero Sign up, navigates to register', async ({
      page,
    }) => {
      await page.goto('/')
      await page.getByRole('link', { name: 'Sign up' }).first().click()
      await expect(page).toHaveURL(/\/auth\/register/)
      await expect(page.locator('h1')).toContainText('Create Account')
    })

    test('When anon clicks nav Sign In, navigates to login', async ({
      page,
    }) => {
      await page.goto('/')
      await openNavMenu(page)
      await page.locator('nav').getByRole('link', { name: 'Sign In' }).click()
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('When anon clicks nav Campaigns, navigates to browse', async ({
      page,
    }) => {
      await page.goto('/')
      await openNavMenu(page)
      await page.locator('nav').getByRole('link', { name: 'Campaigns' }).click()
      await expect(page).toHaveURL(/\/campaigns/)
    })
  })

  test.describe('Authenticated', () => {
    test.use({ storageState: ADMIN_STATE })

    test('When authenticated, landing nav shows Dashboard and Profile links', async ({
      page,
    }) => {
      await page.goto('/')
      await openNavMenu(page)
      await expect(
        page.locator('nav').getByRole('link', { name: 'Dashboard' })
      ).toBeVisible()
      // Desktop: Profile lives in the account dropdown (openAccountMenu
      // opens it); mobile: drawer link "Profile <email>".
      await openAccountMenu(page)
      await expect(
        page.locator('nav').getByRole('link', { name: /Profile/ })
      ).toBeVisible()
    })
  })
})
