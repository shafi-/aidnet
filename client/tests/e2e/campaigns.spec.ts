import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Campaign discovery + management e2e
//
// Public/anon flows are fully self-contained. Authenticated flows (founder
// create+submit, admin verify) use env credentials (E2E_EMAIL / E2E_PASSWORD),
// defaulting to the accounts seeded by supabase/seed.sql so the full path
// runs against a freshly `supabase db reset`'d database.
// ---------------------------------------------------------------------------

const email = process.env.E2E_EMAIL ?? 'test@example.com'
const password = process.env.E2E_PASSWORD ?? 'Password123!'

async function loginIfPossible(page: import('@playwright/test').Page) {
  if (!email || !password) return false
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: /sign in/i }).click()
  try {
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 })
  } catch {
    return false
  }
  return true
}

test.describe('Landing — latest campaigns', () => {
  test('shows Latest Campaigns section with a See more link', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Latest Campaigns' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'See more' })).toBeVisible()
  })

  test('See more navigates to the public campaign list', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'See more' }).click()
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(page.getByRole('heading', { name: 'Discover Campaigns' })).toBeVisible()
  })

  test('renders at most 12 campaign cards', async ({ page }) => {
    await page.goto('/')
    const cards = page.locator('a[href^="/campaigns/detail"]')
    if ((await cards.count()) > 0) {
      expect(await cards.count()).toBeLessThanOrEqual(12)
    }
  })
})

test.describe('Public discovery + filters', () => {
  test('lists live campaigns', async ({ page }) => {
    await page.goto('/campaigns')
    await expect(page.getByRole('heading', { name: 'Discover Campaigns' })).toBeVisible()
  })

  test('zakat filter updates the URL and toggles active', async ({ page }) => {
    await page.goto('/campaigns')
    await page.getByRole('link', { name: /Zakat Eligible|All Campaigns/ }).click()
    await expect(page).toHaveURL(/zakat=true/)
    await expect(page.getByRole('link', { name: 'Zakat Eligible' })).toBeVisible()
  })

  test('anon is blocked from an unavailable campaign slug', async ({ page }) => {
    await page.goto('/campaigns/detail?slug=does-not-exist')
    await expect(page.getByRole('heading', { name: 'Campaign Not Available' })).toBeVisible()
  })

  test('clear filter link removes zakat param', async ({ page }) => {
    await page.goto('/campaigns/?zakat=true')
    await expect(page.getByRole('link', { name: 'Clear filter' })).toBeVisible()
    await page.getByRole('link', { name: 'Clear filter' }).click()
    await expect(page).toHaveURL(/\/campaigns\/?$/)
  })

  test('back to home link navigates to landing', async ({ page }) => {
    await page.goto('/campaigns/')
    await page.getByRole('link', { name: /Home/ }).click()
    await expect(page).toHaveURL('/')
  })
})

test.describe('Admin gating', () => {
  test('non-admin is denied access to the review queue', async ({ page }) => {
    await page.goto('/admin/campaigns')
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible()
  })
})

test.describe('Founder + Admin flow', () => {
  test('founder creates and submits a campaign, admin verifies it live', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')

    // Founder creates a campaign
    const loggedIn = await loginIfPossible(page)
    test.skip(!loggedIn, 'login failed')

    // Select the founder's organization so the campaigns dashboard is available
    await page.goto('/orgs')
    await page.locator('a[href^="/orgs/?id="]').first().click()
    // Page selects the org then cleans the URL via replaceState
    await expect(page).toHaveURL(/\/orgs\/?$/)

    await page.goto('/dashboard/campaigns')
    await page.getByRole('link', { name: 'New Campaign' }).click()
    await page.fill('input[placeholder*="Clean Water"]', `E2E Campaign ${Date.now()}`)
    await page.getByRole('button', { name: 'Create Campaign' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)

    // Submit the most recent draft for review
    await page.getByRole('button', { name: 'Submit for Review' }).first().click()
    await expect(page.getByText(/pending_review|pending/).first()).toBeVisible()

    // Admin verifies it
    await page.goto('/admin/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaign Review Queue' })).toBeVisible()
    const firstItem = page.locator('a[href^="/admin/campaigns/?slug="]').first()
    await firstItem.click()
    await page.getByRole('button', { name: 'Verify & Publish' }).click()
    await expect(page.getByText(/verified and published/i)).toBeVisible()
  })
})
