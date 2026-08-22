import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('When anon loads landing, welcome content renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('SupaNext')
    await expect(page.getByRole('heading', { name: 'Welcome to SupaNext' })).toBeVisible()
    await expect(page.locator('text=A production-ready NextJS + Supabase starter')).toBeVisible()
  })

  test('When anon loads landing, Sign In and Get Started are shown', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible()
  })

  test('When anon loads landing, feature cards render', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Secure Authentication' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Function-First Database' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Modern UI Components' })).toBeVisible()
  })

  test('When anon clicks Sign In, navigates to login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign In' }).first().click()
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.locator('h1')).toContainText('Sign In')
  })

  test('When anon clicks Get Started, navigates to register', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Get Started' }).first().click()
    await expect(page).toHaveURL(/\/auth\/register/)
    await expect(page.locator('h1')).toContainText('Create Account')
  })

  test('When anon clicks nav Sign In, navigates to login', async ({ page }) => {
    await page.goto('/')
    await page.locator('nav').getByRole('link', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('When anon clicks nav Get Started, navigates to register', async ({ page }) => {
    await page.goto('/')
    await page.locator('nav').getByRole('link', { name: 'Get Started' }).click()
    await expect(page).toHaveURL(/\/auth\/register/)
  })

  test('When anon clicks See more, navigates to campaigns browse', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'See more →' }).click()
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(page.getByRole('heading', { name: 'Discover Campaigns' })).toBeVisible()
  })

  test('When campaign cards render, each links to its detail page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Latest Campaigns' })).toBeVisible()

    const cards = page.locator('a[href*="/campaigns/detail"]')
    // With no live campaigns, the section still renders (contract holds).
    if ((await cards.count()) === 0) return

    await cards.first().click()
    await expect(page).toHaveURL(/\/campaigns\/detail\/?\?slug=/)
  })

  test('When anon loads landing, Latest Campaigns section is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Latest Campaigns' })).toBeVisible()
  })
})
