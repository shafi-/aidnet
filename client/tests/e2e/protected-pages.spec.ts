import { test, expect } from '@playwright/test'

const TEST_EMAIL = `protected-${crypto.randomUUID()}@example.com`
const TEST_PASSWORD = 'ProtectedPass123!'

async function registerOrLogin(page: import('@playwright/test').Page) {
  await page.goto('/auth/register/')
  await page.locator('#fullName').fill('Protected Test User')
  await page.locator('#email').fill(TEST_EMAIL)
  await page.locator('#password').fill(TEST_PASSWORD)
  await page.locator('#confirmPassword').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Create Account' }).click()
  try {
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  } catch {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  }
}

test.describe('Protected Pages', () => {
  test.describe('Profile Page', () => {
    test('When not authenticated, /profile redirects to login', async ({
      page,
    }) => {
      await page.goto('/profile/')
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
    })

    test('When authenticated, profile shows the user email', async ({
      page,
    }) => {
      await registerOrLogin(page)

      await page.goto('/profile/')
      await expect(page.locator('h1')).toContainText('Profile')
      await expect(
        page.getByRole('paragraph').filter({ hasText: TEST_EMAIL })
      ).toBeVisible()
    })
  })

  test.describe('Orgs Page', () => {
    test('When not authenticated, visiting /orgs redirects to login', async ({
      page,
    }) => {
      await page.goto('/orgs/')
      await expect(page).toHaveURL(/\/auth\/login\//, { timeout: 10000 })
    })

    test('When authenticated, /orgs shows the organization list', async ({
      page,
    }) => {
      await registerOrLogin(page)

      await page.goto('/orgs/')
      await expect(
        page.getByRole('heading', { name: 'Organizations' })
      ).toBeVisible()
      // Request-flow UX: creation happens via the request CTA (link), not an
      // inline Create Organization button.
      await expect(
        page.getByRole('link', { name: 'Request Organization' })
      ).toBeVisible()
    })
  })

  test.describe('Invite Page', () => {
    // Well-formed (64-hex) but unknown token: exercises the full
    // validate_invite(token, email) round-trip ending in a DB null.
    const unknownToken = 'a'.repeat(64)

    test('When email submitted against unknown token, Invalid Invite is shown', async ({
      page,
    }) => {
      await page.goto(`/invite/?token=${unknownToken}`)
      await page.getByPlaceholder('you@example.com').fill('someone@example.com')
      await page.getByRole('button', { name: 'Check Invite' }).click()
      await expect(
        page.getByRole('heading', { name: 'Invalid Invite' })
      ).toBeVisible({ timeout: 10000 })
    })

    test('When malformed token submitted with email, Invalid Invite is shown', async ({
      page,
    }) => {
      await page.goto('/invite/?token=invalidtoken')
      await page.getByPlaceholder('you@example.com').fill('someone@example.com')
      await page.getByRole('button', { name: 'Check Invite' }).click()
      await expect(
        page.getByRole('heading', { name: 'Invalid Invite' })
      ).toBeVisible({ timeout: 10000 })
    })

    test('When empty token supplied, invite page renders', async ({ page }) => {
      await page.goto('/invite/')
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
