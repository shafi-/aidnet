import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('loads and displays welcome content', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('SupaNext')
    await expect(page.getByRole('heading', { name: 'Welcome to SupaNext' })).toBeVisible()
    await expect(page.locator('text=A production-ready NextJS + Supabase starter')).toBeVisible()
  })

  test('shows Sign In and Get Started buttons when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible()
  })

  test('feature cards are displayed', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Secure Authentication' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Function-First Database' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Modern UI Components' })).toBeVisible()
  })

  test('Sign In link navigates to login page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign In' }).first().click()
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.locator('h1')).toContainText('Sign In')
  })

  test('Get Started link navigates to register page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Get Started' }).first().click()
    await expect(page).toHaveURL(/\/auth\/register/)
    await expect(page.locator('h1')).toContainText('Create Account')
  })

  test('nav Sign In link navigates to login page', async ({ page }) => {
    await page.goto('/')
    await page.locator('nav').getByRole('link', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('nav Get Started link navigates to register page', async ({ page }) => {
    await page.goto('/')
    await page.locator('nav').getByRole('link', { name: 'Get Started' }).click()
    await expect(page).toHaveURL(/\/auth\/register/)
  })

  test('See more link navigates to campaigns browse', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'See more →' }).click()
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(page.getByRole('heading', { name: 'Discover Campaigns' })).toBeVisible()
  })

  test('campaign cards link to detail page', async ({ page }) => {
    await page.goto('/')
    const cards = page.locator('a[href*="/campaigns/detail"]')
    const count = await cards.count()
    test.skip(count === 0, 'No live campaigns seeded')
    await cards.first().click()
    await expect(page).toHaveURL(/\/campaigns\/detail\/?\?slug=/)
  })

  test('Latest Campaigns section is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Latest Campaigns' })).toBeVisible()
  })
})
