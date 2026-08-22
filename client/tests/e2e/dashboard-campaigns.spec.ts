import { test, expect } from '@playwright/test'

const OWNER_STATE = 'tests/e2e/.auth/orgOwner.json'

test.use({ storageState: OWNER_STATE })

test.describe('Dashboard Campaigns', () => {
  test('When owner loads /dashboard/campaigns, list and New Campaign link show', async ({ page }) => {
    await page.goto('/dashboard/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaigns' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New Campaign' })).toBeVisible()
  })

  test('When owner clicks New Campaign, navigates to campaign form', async ({ page }) => {
    await page.goto('/dashboard/campaigns')
    await page.getByRole('link', { name: 'New Campaign' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/new/)
    await expect(page.getByRole('heading', { name: 'New Campaign' })).toBeVisible()
  })

  test('When owner opens campaign form, all fields are present', async ({ page }) => {
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

  test('When owner submits campaign form, returns to campaigns list', async ({ page }) => {
    await page.goto('/dashboard/campaigns/new')
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(`E2E Campaign ${Date.now()}`)
    await page.getByRole('button', { name: 'Create Campaign' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)
  })

  test('When owner clicks Cancel on form, returns to campaigns list', async ({ page }) => {
    await page.goto('/dashboard/campaigns/new')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)
  })

  test('When campaigns exist, each shows an Edit link', async ({ page }) => {
    await page.goto('/dashboard/campaigns')
    const editLinks = page.locator('a[href*="/dashboard/campaigns/edit"]')
    if ((await editLinks.count()) > 0) {
      await expect(editLinks.first()).toBeVisible()
    }
  })

  test('When owner clicks Edit, navigates to edit form', async ({ page }) => {
    await page.goto('/dashboard/campaigns')
    const editLink = page.locator('a[href*="/dashboard/campaigns/edit"]').first()
    if ((await editLink.count()) > 0) {
      await editLink.click()
      await expect(page).toHaveURL(/\/dashboard\/campaigns\/edit/)
      await expect(page.getByRole('heading', { name: 'Edit Campaign' })).toBeVisible()
    }
  })

  test('When owner opens edit form, fields are pre-filled with Save Changes', async ({ page }) => {
    await page.goto('/dashboard/campaigns')
    const editLink = page.locator('a[href*="/dashboard/campaigns/edit"]').first()
    if ((await editLink.count()) > 0) {
      await editLink.click()
      const titleInput = page.getByRole('textbox', { name: 'Title', exact: true })
      await expect(titleInput).not.toHaveValue('')
      await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
    }
  })

  test('When draft campaigns exist, Submit for Review is shown', async ({ page }) => {
    await page.goto('/dashboard/campaigns')
    const submitBtn = page.getByRole('button', { name: 'Submit for Review' })
    if ((await submitBtn.count()) > 0) {
      await expect(submitBtn.first()).toBeVisible()
    }
  })

  test('When owner toggles Zakat eligible, checkbox becomes checked', async ({ page }) => {
    await page.goto('/dashboard/campaigns/new')
    const zakatRow = page.getByText('Zakat eligible', { exact: true })
    const checkbox = zakatRow.locator('..').locator('input[type="checkbox"]')
    await expect(checkbox).toBeVisible()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
  })
})
