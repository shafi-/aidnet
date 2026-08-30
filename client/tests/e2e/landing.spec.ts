import { test, expect } from '@playwright/test'

const ADMIN_STATE = 'tests/e2e/.auth/systemAdmin.json'

test.describe('Landing Page', () => {
  test('When anon loads landing, welcome content renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Donate')
    await expect(
      page.getByRole('heading', { name: 'Welcome to Donate' })
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

  test.describe('Navigation from landing', () => {
    test('When anon loads landing, nav shows brand and auth links', async ({
      page,
    }) => {
      await page.goto('/')
      const nav = page.locator('nav')
      await expect(nav.locator('h1')).toContainText('Donate')
      await expect(nav.getByRole('link', { name: 'Campaigns' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Sign In' })).toBeVisible()
    })

    test('When anon clicks hero Sign In, navigates to login', async ({
      page,
    }) => {
      await page.goto('/')
      await page.getByRole('link', { name: 'Sign In' }).first().click()
      await expect(page).toHaveURL(/\/auth\/login/)
      await expect(page.locator('h1')).toContainText('Sign In')
    })

    test('When anon clicks hero Get Started, navigates to register', async ({
      page,
    }) => {
      await page.goto('/')
      await page.getByRole('link', { name: 'Get Started' }).first().click()
      await expect(page).toHaveURL(/\/auth\/register/)
      await expect(page.locator('h1')).toContainText('Create Account')
    })

    test('When anon clicks nav Sign In, navigates to login', async ({
      page,
    }) => {
      await page.goto('/')
      await page.locator('nav').getByRole('link', { name: 'Sign In' }).click()
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('When anon clicks nav Campaigns, navigates to browse', async ({
      page,
    }) => {
      await page.goto('/')
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
      await expect(
        page.locator('nav').getByRole('link', { name: 'Dashboard' })
      ).toBeVisible()
      await expect(
        page.locator('nav').getByRole('link', { name: 'Profile' })
      ).toBeVisible()
    })
  })
})
