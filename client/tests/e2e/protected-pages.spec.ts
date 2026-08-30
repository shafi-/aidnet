import { test, expect } from '@playwright/test'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }

test.describe('Protected Pages', () => {
  test.describe('Profile Page', () => {
    test('When not authenticated, /profile redirects to login', async ({
      page,
    }) => {
      await page.goto('/profile/')
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('When authenticated, profile shows the user email', async ({
      page,
    }) => {
      await page.goto('/auth/login/')
      await page.locator('#email').fill(OWNER.email)
      await page.locator('#password').fill(OWNER.password)
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page).toHaveURL(/\/dashboard/)

      await page.goto('/profile/')
      await expect(page.locator('h1')).toContainText('Profile')
      await expect(
        page.getByRole('paragraph').filter({ hasText: OWNER.email })
      ).toBeVisible()
    })
  })

  test.describe('Orgs Page', () => {
    test('When not authenticated, visiting /orgs redirects to login', async ({
      page,
    }) => {
      await page.goto('/orgs/')
      await expect(page).toHaveURL(/\/auth\/login\//)
    })

    test('When authenticated, /orgs shows the organization list', async ({
      page,
    }) => {
      await page.goto('/auth/login/')
      await page.locator('#email').fill(OWNER.email)
      await page.locator('#password').fill(OWNER.password)
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page).toHaveURL(/\/dashboard/)

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
      ).toBeVisible()
    })

    test('When malformed token submitted with email, Invalid Invite is shown', async ({
      page,
    }) => {
      await page.goto('/invite/?token=invalidtoken')
      await page.getByPlaceholder('you@example.com').fill('someone@example.com')
      await page.getByRole('button', { name: 'Check Invite' }).click()
      await expect(
        page.getByRole('heading', { name: 'Invalid Invite' })
      ).toBeVisible()
    })

    test('When empty token supplied, invite page renders', async ({ page }) => {
      await page.goto('/invite/')
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
