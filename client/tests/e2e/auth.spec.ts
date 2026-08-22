import { test, expect } from '@playwright/test'
import { signIn, SUPABASE_URL } from './lib/api'

const TEST_EMAIL = `test-${Date.now()}@example.com`
const TEST_PASSWORD = 'TestPassword123!'

test.describe('Auth Flow', () => {
  test.describe('Register Page', () => {
    test('When anon opens register, form fields render', async ({ page }) => {
      await page.goto('/auth/register/')
      await expect(page.locator('h1')).toContainText('Create Account')
      await expect(page.locator('text=Join SupaNext today')).toBeVisible()
      await expect(page.locator('#fullName')).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('#confirmPassword')).toBeVisible()
    })

    test('When passwords do not match, error is shown', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.locator('#email').fill('test@example.com')
      await page.locator('#password').fill('password123')
      await page.locator('#confirmPassword').fill('differentpassword')
      await page.getByRole('button', { name: 'Create Account' }).click()
      await expect(page.locator('text=Passwords do not match')).toBeVisible()
    })

    test('When password too short, error is shown', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.locator('#email').fill('test@example.com')
      await page.locator('#password').fill('12345')
      await page.locator('#confirmPassword').fill('12345')
      await page.getByRole('button', { name: 'Create Account' }).click()
      await expect(
        page.locator('text=Password must be at least 6 characters')
      ).toBeVisible()
    })

    test('When user clicks Sign in, navigates to login', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.getByRole('link', { name: 'Sign in' }).click()
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('When user clicks Back to home, navigates to /', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')
    })

    test('When anon submits valid registration, redirected to dashboard', async ({
      page,
    }) => {
      await page.goto('/auth/register/')
      await page.locator('#fullName').fill('Test User')
      await page.locator('#email').fill(TEST_EMAIL)
      await page.locator('#password').fill(TEST_PASSWORD)
      await page.locator('#confirmPassword').fill(TEST_PASSWORD)
      await page.getByRole('button', { name: 'Create Account' }).click()

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    })
  })

  test.describe('Login Page', () => {
    test('When anon opens login, form fields render', async ({ page }) => {
      await page.goto('/auth/login/')
      await expect(page.locator('h1')).toContainText('Sign In')
      await expect(page.locator('text=Welcome back to SupaNext')).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('#remember')).toBeVisible()
    })

    test('When invalid credentials submitted, error message is shown', async ({
      page,
    }) => {
      await page.goto('/auth/login/')
      await page.locator('#email').fill('nonexistent@example.com')
      await page.locator('#password').fill('wrongpassword')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(
        page.getByText(/invalid|incorrect|credentials|could not/i)
      ).toBeVisible({ timeout: 10000 })
    })

    test('When user clicks Sign up, navigates to register', async ({
      page,
    }) => {
      await page.goto('/auth/login/')
      await page.getByRole('link', { name: 'Sign up' }).click()
      await expect(page).toHaveURL(/\/auth\/register/)
    })

    test('When user clicks Forgot password?, navigates to reset-password', async ({
      page,
    }) => {
      await page.goto('/auth/login')
      await page.getByRole('link', { name: 'Forgot password?' }).click()
      await expect(page).toHaveURL(/\/auth\/reset-password/)
    })

    test('When user clicks Back to home, navigates to /', async ({ page }) => {
      await page.goto('/auth/login/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')
    })

    test('When valid credentials submitted, redirected to dashboard', async ({
      page,
      request,
    }) => {
      const loginEmail = `login-${Date.now()}@example.com`

      await page.goto('/auth/register/')
      await page.locator('#fullName').fill('Login Test User')
      await page.locator('#email').fill(loginEmail)
      await page.locator('#password').fill(TEST_PASSWORD)
      await page.locator('#confirmPassword').fill(TEST_PASSWORD)
      await page.getByRole('button', { name: 'Create Account' }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

      // Dashboard has no nav — go to a page with AppLayout to sign out
      await page.goto('/campaigns/')
      await page.locator('button', { hasText: 'Sign out' }).click()
      await expect(page).toHaveURL(/\/auth\/login\//, { timeout: 10000 })

      // API contract: the auth backend issues a session for valid creds.
      // Asserting this before the UI flow isolates an auth-backend regression
      // from a UI redirect bug.
      test.skip(
        !SUPABASE_URL,
        'NEXT_PUBLIC_SUPABASE_URL not set — skipping API check'
      )
      const session = await signIn(request, loginEmail, TEST_PASSWORD)
      expect(session.access_token).toBeTruthy()

      await page.locator('#email').fill(loginEmail)
      await page.locator('#password').fill(TEST_PASSWORD)
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    })
  })

  test.describe('Reset Password Page', () => {
    test('When anon opens reset-password, email form renders', async ({
      page,
    }) => {
      await page.goto('/auth/reset-password/')
      await expect(page.locator('h1')).toContainText('Reset Password')
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Send reset link' })
      ).toBeVisible()
    })

    test.describe.serial('submit outcomes', () => {
      // Run success first against a clean rate-limit window, then force the
      // rate-limited branch by repeating the request.
      test('When valid email submitted, check-your-email and back-to-login show', async ({
        page,
      }) => {
        await page.goto('/auth/reset-password/')
        await page.locator('input[type="email"]').fill('test@example.com')
        await page.getByRole('button', { name: 'Send reset link' }).click()

        await expect(
          page.getByRole('heading', { name: 'Check your email' })
        ).toBeVisible({
          timeout: 10000,
        })
        await expect(
          page.getByText('We sent a password reset link')
        ).toBeVisible()
        await expect(
          page.getByRole('link', { name: 'Back to login' })
        ).toBeVisible()
        await page.getByRole('link', { name: 'Back to login' }).click()
        await expect(page).toHaveURL(/\/auth\/login/)
      })

      test('When request repeated, rate-limit message is shown', async ({
        page,
      }) => {
        await page.goto('/auth/reset-password/')
        await page.locator('input[type="email"]').fill('test@example.com')
        // First submit may or may not succeed; repeat to exhaust the cooldown
        // and force the rate-limited branch deterministically.
        await page.getByRole('button', { name: 'Send reset link' }).click()
        await page.getByRole('button', { name: 'Send reset link' }).click()

        await expect(page.getByText(/only request this after/)).toBeVisible({
          timeout: 10000,
        })
      })
    })
  })
})
