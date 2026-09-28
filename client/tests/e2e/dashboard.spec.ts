import { test, expect } from '@playwright/test'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }

test.describe('Dashboard', () => {
  test('When not authenticated, /dashboard redirects to login', async ({
    page,
  }) => {
    await page.goto('/dashboard/')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('When authenticated, dashboard shows welcome and heading', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(OWNER.email)
    await page.locator('#password').fill(OWNER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true })
    ).toBeVisible()
    // Greeting uses the profile full name when set and no raw-email
    // fallback — the seeded owner has none, so the bare welcome renders.
    await expect(page.locator('text=Welcome back!')).toBeVisible()
  })

  test('When authenticated, dashboard shows org and profile links', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(OWNER.email)
    await page.locator('#password').fill(OWNER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Manage Organizations →' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Update Profile →' })
    ).toBeVisible()
  })

  test('When authenticated, dashboard shows card sections', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(OWNER.email)
    await page.locator('#password').fill(OWNER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await expect(
      page.getByRole('heading', { name: 'My Organizations' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Profile Settings' })
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible()
  })

  test('When authenticated, dashboard shows Quick Stats section', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(OWNER.email)
    await page.locator('#password').fill(OWNER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await expect(
      page.getByRole('heading', { name: 'Quick Stats' })
    ).toBeVisible()
  })

  test('When authed user clicks their email in nav, navigates to profile', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(OWNER.email)
    await page.locator('#password').fill(OWNER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Dashboard has no nav — use a page with AppLayout nav
    await page.goto('/campaigns/')
    await page.locator('nav').getByText(OWNER.email).click()
    await expect(page).toHaveURL(/\/profile/)
  })

  test('When authed user clicks Sign out, redirected to login', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(OWNER.email)
    await page.locator('#password').fill(OWNER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Dashboard has no nav — use a page with AppLayout nav
    await page.goto('/campaigns/')
    await page.locator('button', { hasText: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/auth\/login\//)
  })
})
