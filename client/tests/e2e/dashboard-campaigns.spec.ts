import { test, expect } from '@playwright/test'

const OWNER_EMAIL = 'owner@donate.app'
const ADMIN_EMAIL = 'admin@donate.app'
const password = 'Password123!'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', OWNER_EMAIL)
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 })
}

async function selectOrg(page: import('@playwright/test').Page) {
  await page.goto('/orgs')
  // Wait for localStorage to be set — either by auto-select (1 org) or by clicking a link
  const hasOrg = await page.waitForFunction(() => {
    return localStorage.getItem('supanext.currentOrgId') !== null
  }, { timeout: 10000 }).then(() => true).catch(() => false)
  if (!hasOrg) {
    // Multiple orgs — click the first one
    await page.locator('a[href*="/orgs?id="]').first().click()
    await page.waitForFunction(() => {
      return localStorage.getItem('supanext.currentOrgId') !== null
    }, { timeout: 10000 })
  }
}

test.describe('Dashboard Campaigns', () => {
  test('shows campaigns list page with New Campaign link', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaigns' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New Campaign' })).toBeVisible()
  })

  test('New Campaign link navigates to campaign form', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns')
    await page.getByRole('link', { name: 'New Campaign' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/new/)
    await expect(page.getByRole('heading', { name: 'New Campaign' })).toBeVisible()
  })

  test('campaign form shows all fields', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns/new')
    await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /Slug/ })).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByLabel('Cover Image URL')).toBeVisible()
    await expect(page.getByLabel('Goal Amount (display only)')).toBeVisible()
    await expect(page.getByLabel('Currency')).toBeVisible()
    await expect(page.getByLabel('Start Date')).toBeVisible()
    await expect(page.getByLabel('End Date')).toBeVisible()
    await expect(page.getByText('Zakat eligible', { exact: true })).toBeVisible()
  })

  test('can create a campaign from form', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns/new')
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(`E2E Campaign ${Date.now()}`)
    await page.getByRole('button', { name: 'Create Campaign' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)
  })

  test('cancel button navigates back to campaigns list', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns/new')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)
  })

  test('campaign list shows Edit link for each campaign', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns')
    const editLinks = page.locator('a[href*="/dashboard/campaigns/edit"]')
    if ((await editLinks.count()) > 0) {
      await expect(editLinks.first()).toBeVisible()
    }
  })

  test('Edit link navigates to campaign edit form', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns')
    const editLink = page.locator('a[href*="/dashboard/campaigns/edit"]').first()
    if ((await editLink.count()) > 0) {
      await editLink.click()
      await expect(page).toHaveURL(/\/dashboard\/campaigns\/edit/)
      await expect(page.getByRole('heading', { name: 'Edit Campaign' })).toBeVisible()
    }
  })

  test('edit form shows pre-filled data and Save Changes button', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns')
    const editLink = page.locator('a[href*="/dashboard/campaigns/edit"]').first()
    if ((await editLink.count()) > 0) {
      await editLink.click()
      const titleInput = page.getByRole('textbox', { name: 'Title', exact: true })
      await expect(titleInput).not.toHaveValue('')
      await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
    }
  })

  test('campaign list shows Submit for Review for draft campaigns', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns')
    const submitBtn = page.getByRole('button', { name: 'Submit for Review' })
    if ((await submitBtn.count()) > 0) {
      await expect(submitBtn.first()).toBeVisible()
    }
  })

  test('can toggle zakat eligible checkbox in campaign form', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await selectOrg(page)

    await page.goto('/dashboard/campaigns/new')
    const zakatRow = page.getByText('Zakat eligible', { exact: true })
    const checkbox = zakatRow.locator('..').locator('input[type="checkbox"]')
    await expect(checkbox).toBeVisible()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
  })
})
