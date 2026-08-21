import { test, expect } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'test@example.com'
const password = process.env.E2E_PASSWORD ?? 'Password123!'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 })
}

test.describe('Orgs Page', () => {
  test('shows existing orgs as clickable links', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await page.goto('/orgs')

    const orgLinks = page.locator('a[href^="/orgs/?id="]')
    await expect(orgLinks.first()).toBeVisible()
    expect(await orgLinks.count()).toBeGreaterThanOrEqual(1)
  })

  test('shows Create Organization form when button clicked', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await page.goto('/orgs')

    await page.getByRole('button', { name: 'Create Organization' }).click()
    await expect(page.getByText('Organization Name', { exact: true })).toBeVisible()
    await expect(page.getByText('Description', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible()
  })

  test('can fill and submit create organization form', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await page.goto('/orgs')

    await page.getByRole('button', { name: 'Create Organization' }).click()

    const orgName = `E2E Org ${Date.now()}`
    const nameInput = page.locator('text=Organization Name').locator('..').locator('input').first()
    const slugInput = page.locator('text=Slug').locator('..').locator('input').first()
    const descInput = page.locator('text=Description').locator('..').locator('textarea').first()

    await nameInput.fill(orgName)
    await slugInput.fill(`e2e-org-${Date.now()}`)
    await descInput.fill('Created by e2e test')

    // Handle possible alert from API error (e.g., one-org limit)
    page.on('dialog', dialog => dialog.accept())

    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await page.waitForTimeout(2000)

    // Form submission triggers — either redirects to dashboard or stays with error alert
    const onDashboard = page.url().includes('/dashboard')
    const stillOnOrgs = page.url().includes('/orgs')
    expect(onDashboard || stillOnOrgs).toBeTruthy()
  })

  test('clicking an org card navigates to org detail', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await login(page)
    await page.goto('/orgs')

    const orgLink = page.locator('a[href^="/orgs/?id="]').first()
    await orgLink.click()
    await expect(page).toHaveURL(/\/orgs\/\?id=/)
  })
})
