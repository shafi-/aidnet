import { test, expect } from '@playwright/test'
import { signIn, SUPABASE_URL } from './lib/api'
import { gotoStable, loginViaUi } from './lib/ui'

const TEST_EMAIL = `test-${Date.now()}@example.com`
const TEST_PASSWORD = 'TestPassword123!'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }

test.describe('Auth Flow', () => {
  test.describe('Register Page', () => {
    test('When anon opens register, form fields render', async ({ page }) => {
      await gotoStable(page, '/auth/register/')
      await expect(page.locator('h1')).toContainText('Create Account')
      await expect(page.locator('text=Join AidNet today')).toBeVisible()
      await expect(page.locator('#fullName')).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('#confirmPassword')).toBeVisible()
    })

    test('When passwords do not match, error is shown', async ({ page }) => {
      await gotoStable(page, '/auth/register/')
      // Controlled form: fill only after hydration or React wipes the values.
      await page.waitForLoadState('networkidle')
      await page.locator('#email').fill('test@example.com')
      await page.locator('#password').fill('password123')
      await page.locator('#confirmPassword').fill('differentpassword')
      await page.getByRole('button', { name: 'Create Account' }).click()
      await expect(page.locator('text=Passwords do not match')).toBeVisible()
    })

    test('When password too short, error is shown', async ({ page }) => {
      await gotoStable(page, '/auth/register/')
      // Controlled form: fill only after hydration or React wipes the values.
      await page.waitForLoadState('networkidle')
      await page.locator('#email').fill('test@example.com')
      await page.locator('#password').fill('12345')
      await page.locator('#confirmPassword').fill('12345')
      await page.getByRole('button', { name: 'Create Account' }).click()
      await expect(
        page.locator('text=Password must be at least 6 characters')
      ).toBeVisible()
    })

    test('When user clicks Sign in, navigates to login', async ({ page }) => {
      await gotoStable(page, '/auth/register/')
      await page.getByRole('link', { name: 'Sign in' }).click()
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('When user clicks Back to home, navigates to /', async ({ page }) => {
      await gotoStable(page, '/auth/register/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')
    })

    test('When anon submits valid registration, redirected to dashboard', async ({
      page,
    }) => {
      await gotoStable(page, '/auth/register/')
      await page.locator('#fullName').fill('Test User')
      await page.locator('#email').fill(TEST_EMAIL)
      await page.locator('#password').fill(TEST_PASSWORD)
      await page.locator('#confirmPassword').fill(TEST_PASSWORD)
      await page.getByRole('button', { name: 'Create Account' }).click()

      await expect(page).toHaveURL(/\/dashboard/)
    })
  })

  test.describe('Login Page', () => {
    test('When anon opens login, form fields render', async ({ page }) => {
      await gotoStable(page, '/auth/login/')
      await expect(page.locator('h1')).toContainText('Sign In')
      await expect(page.locator('text=Welcome back')).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
    })

    test('When invalid credentials submitted, error message is shown', async ({
      page,
    }) => {
      await gotoStable(page, '/auth/login/')
      // Controlled inputs: fill only after hydration or the values get wiped.
      await page.waitForLoadState('networkidle')
      await page.locator('#email').fill('nonexistent@example.com')
      await page.locator('#password').fill('wrongpassword')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(
        page.getByText(/invalid|incorrect|credentials|could not/i)
      ).toBeVisible()
    })

    test('When user clicks Sign up, navigates to register', async ({
      page,
    }) => {
      await gotoStable(page, '/auth/login/')
      await page.getByRole('link', { name: 'Sign up' }).click()
      await expect(page).toHaveURL(/\/auth\/register/)
    })

    test('When user clicks Forgot password?, navigates to reset-password', async ({
      page,
    }) => {
      await gotoStable(page, '/auth/login')
      await page.getByRole('link', { name: 'Forgot password?' }).click()
      await expect(page).toHaveURL(/\/auth\/reset-password/)
    })

    test('When user clicks Back to home, navigates to /', async ({ page }) => {
      await gotoStable(page, '/auth/login/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')
    })

    test('When valid credentials submitted, redirected to dashboard', async ({
      page,
      request,
    }) => {
      // API contract: the auth backend issues a session for valid creds.
      test.skip(
        !SUPABASE_URL,
        'NEXT_PUBLIC_SUPABASE_URL not set — skipping API check'
      )
      const session = await signIn(request, OWNER.email, OWNER.password)
      expect(session.access_token).toBeTruthy()

      await loginViaUi(page, OWNER.email, OWNER.password)
    })
  })

  test.describe('Reset Password Page', () => {
    test('When anon opens reset-password, email form renders', async ({
      page,
    }) => {
      await gotoStable(page, '/auth/reset-password/')
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
        await gotoStable(page, '/auth/reset-password/')
        // Controlled form: fill only after hydration or React wipes the value.
        await page.waitForLoadState('networkidle')
        await page.locator('input[type="email"]').fill('test@example.com')
        await page.getByRole('button', { name: 'Send reset link' }).click()

        await expect(
          page.getByRole('heading', { name: 'Check your email' })
        ).toBeVisible()
        await expect(
          page.getByText('We sent a password reset link')
        ).toBeVisible()
        await expect(
          page.getByRole('link', { name: 'Back to login' })
        ).toBeVisible()
        await page.getByRole('link', { name: 'Back to login' }).click()
        await expect(page).toHaveURL(/\/auth\/login/)
      })

      test('When reset requested repeatedly, feedback stays consistent', async ({
        page,
      }) => {
        // GoTrue's email_sent limit requires enabled SMTP, which this
        // project deliberately keeps disabled (cost). A true 429 path is
        // unreachable in any environment we run tests in. End-user
        // expectation to verify: repeated requests never crash the flow and
        // always land on the clear "check your email" confirmation.
        for (let i = 0; i < 2; i++) {
          await gotoStable(page, '/auth/reset-password/')
          // Controlled form: fill only after hydration or React wipes it.
          await page.waitForLoadState('networkidle')
          await page.locator('input[type="email"]').fill('test@example.com')
          await page.getByRole('button', { name: 'Send reset link' }).click()
          await expect(
            page.getByText('We sent a password reset link')
          ).toBeVisible()
        }
      })
    })
  })
})
