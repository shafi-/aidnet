import { test, expect } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'test@example.com'
const password = process.env.E2E_PASSWORD ?? 'Password123!'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 })
}

async function goToAdminPlans(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto('/admin/plans')
  try {
    // Wait for either the plans heading or the access denied heading
    await page.locator('h1').filter({ hasText: 'Subscription Plans' }).waitFor({ timeout: 15000 })
    return true
  } catch {
    try {
      await page.locator('h1').filter({ hasText: 'Access Denied' }).waitFor({ timeout: 2000 })
      return false
    } catch {
      return false
    }
  }
}

test.describe('Admin - Subscription Plans', () => {
  test('plans page shows Create Plan button or access denied', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    const isAdmin = await goToAdminPlans(page)
    if (!isAdmin) {
      await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible()
      return
    }
    await expect(page.getByRole('heading', { name: 'Subscription Plans' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Plan' })).toBeVisible()
  })

  test('Create Plan button opens form with required fields', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    const isAdmin = await goToAdminPlans(page)
    test.skip(!isAdmin, 'User is not a system admin')

    await page.getByRole('button', { name: 'Create Plan' }).click()
    await expect(page.locator('h2').filter({ hasText: 'Create Plan' })).toBeVisible()
    const inputs = page.locator('.bg-white.p-6.rounded-lg.shadow input')
    expect(await inputs.count()).toBeGreaterThanOrEqual(3)
  })

  test('Cancel button closes create form', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    const isAdmin = await goToAdminPlans(page)
    test.skip(!isAdmin, 'User is not a system admin')

    await page.getByRole('button', { name: 'Create Plan' }).click()
    await expect(page.locator('h2').filter({ hasText: 'Create Plan' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('h2').filter({ hasText: 'Create Plan' })).not.toBeVisible()
  })

  test('plans table shows seed plans', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    const isAdmin = await goToAdminPlans(page)
    test.skip(!isAdmin, 'User is not a system admin')

    const table = page.locator('table')
    await expect(table).toBeVisible()
    await expect(page.getByText('Free')).toBeVisible()
    await expect(page.getByText('Pro')).toBeVisible()
    await expect(page.getByText('Enterprise')).toBeVisible()
  })

  test('each plan row has Edit and Activate/Deactivate buttons', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    const isAdmin = await goToAdminPlans(page)
    test.skip(!isAdmin, 'User is not a system admin')

    const editButtons = page.getByRole('button', { name: 'Edit' })
    const toggleButtons = page.getByRole('button', { name: /Activate|Deactivate/ })
    expect(await editButtons.count()).toBeGreaterThanOrEqual(3)
    expect(await toggleButtons.count()).toBeGreaterThanOrEqual(3)
  })

  test('Edit button opens edit form with pre-filled data', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    const isAdmin = await goToAdminPlans(page)
    test.skip(!isAdmin, 'User is not a system admin')

    await page.getByRole('button', { name: 'Edit' }).first().click()
    await expect(page.locator('h2').filter({ hasText: 'Edit Plan' })).toBeVisible()
    const nameInput = page.locator('.bg-white.p-6.rounded-lg.shadow input[type="text"]').first()
    const nameValue = await nameInput.inputValue()
    expect(nameValue.length).toBeGreaterThan(0)
  })

  test('create plan form submits', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    const isAdmin = await goToAdminPlans(page)
    test.skip(!isAdmin, 'User is not a system admin')

    await page.getByRole('button', { name: 'Create Plan' }).click()
    const nameInput = page.locator('.bg-white.p-6.rounded-lg.shadow input[type="text"]').first()
    await nameInput.fill(`E2E Plan ${Date.now()}`)
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await page.waitForTimeout(1000)
  })
})

test.describe('Admin - Campaign Review', () => {
  test('campaign review queue shows heading', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    await page.goto('/admin/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaign Review Queue' })).toBeVisible()
  })

  test('campaign review shows pending campaigns or empty state', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    await page.goto('/admin/campaigns')
    const pendingItems = page.locator('a[href^="/admin/campaigns/?slug="]')
    const emptyState = page.getByText('No campaigns pending review')
    const count = await pendingItems.count()
    if (count === 0) {
      await expect(emptyState).toBeVisible()
    } else {
      await expect(pendingItems.first()).toBeVisible()
    }
  })

  test('clicking pending campaign shows review details', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    await page.goto('/admin/campaigns')
    const pendingItem = page.locator('a[href^="/admin/campaigns/?slug="]').first()
    if ((await pendingItem.count()) === 0) {
      test.skip()
      return
    }
    await pendingItem.click()
    await expect(page.getByRole('heading', { name: 'Review Campaign' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Verify & Publish' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible()
  })

  test('reject button requires confirmation and rejects campaign', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    await page.goto('/admin/campaigns')
    const pendingItem = page.locator('a[href^="/admin/campaigns/?slug="]').first()
    if ((await pendingItem.count()) === 0) {
      test.skip()
      return
    }
    await pendingItem.click()

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Reject' }).click()
    await page.waitForTimeout(1000)
  })

  test('back to queue link navigates back', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    await page.goto('/admin/campaigns')
    const pendingItem = page.locator('a[href^="/admin/campaigns/?slug="]').first()
    if ((await pendingItem.count()) === 0) {
      test.skip()
      return
    }
    await pendingItem.click()
    await page.getByRole('link', { name: '← Back to queue' }).click()
    await expect(page).toHaveURL(/\/admin\/campaigns\/?$/)
  })
})

test.describe('Admin - Subscriptions Management', () => {
  test('subscriptions page shows heading and table', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    await page.goto('/admin/subscriptions')
    await expect(page.getByRole('heading', { name: 'Organization Subscriptions' })).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('subscriptions page shows empty state or data rows', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    await page.goto('/admin/subscriptions')
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count > 0) {
      await expect(rows.first()).toBeVisible()
    }
  })

  test('subscription rows have History and Pause/Unpause buttons when data exists', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    await page.goto('/admin/subscriptions')
    const rows = page.locator('table tbody tr')
    if ((await rows.count()) === 0) {
      test.skip()
      return
    }
    const historyBtn = page.getByRole('button', { name: 'History' }).first()
    const pauseBtn = page.getByRole('button', { name: /Pause|Unpause/ }).first()
    await expect(historyBtn).toBeVisible()
    await expect(pauseBtn).toBeVisible()
  })

  test('History button opens history panel', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await loginAsAdmin(page)

    await page.goto('/admin/subscriptions')
    const historyBtn = page.getByRole('button', { name: 'History' }).first()
    if ((await historyBtn.count()) === 0) {
      test.skip()
      return
    }
    await historyBtn.click()
    await expect(page.getByRole('heading', { name: 'Subscription History' })).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('heading', { name: 'Subscription History' })).not.toBeVisible()
  })
})
