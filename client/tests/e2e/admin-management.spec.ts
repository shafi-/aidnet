import { test, expect } from '@playwright/test'
import { AdminPlansPage } from './pages/AdminPages'

const OWNER_STATE = 'tests/e2e/.auth/orgOwner.json'
const ADMIN_STATE = 'tests/e2e/.auth/systemAdmin.json'

test.describe('System Admin - Plan Management', () => {
  test.describe(() => {
    test.use({ storageState: ADMIN_STATE })

    test('When system admin opens /admin/plans, plans management loads', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      expect(await plans.open()).toBe('allowed')
      await expect(
        page.getByRole('heading', { name: 'Subscription Plans' })
      ).toBeVisible()
    })

    test('When admin opens Create Plan, form shows required fields', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await page.getByRole('button', { name: 'Create Plan' }).click()
      await expect(
        page.locator('h2').filter({ hasText: 'Create Plan' })
      ).toBeVisible()
      const inputs = page.getByRole('textbox')
      expect(await inputs.count()).toBeGreaterThanOrEqual(3)
    })

    test('When admin cancels Create Plan, form closes', async ({ page }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await page.getByRole('button', { name: 'Create Plan' }).click()
      await expect(
        page.locator('h2').filter({ hasText: 'Create Plan' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(
        page.locator('h2').filter({ hasText: 'Create Plan' })
      ).not.toBeVisible()
    })

    test('When admin opens /admin/plans, seeded plans are listed', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await expect(page.locator('table')).toBeVisible()
      await expect(page.getByText('Free')).toBeVisible()
      await expect(page.getByText('Pro')).toBeVisible()
      await expect(page.getByText('Enterprise')).toBeVisible()
    })

    test('When plans listed, each row offers edit and activate/deactivate', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      expect(
        await page.getByRole('button', { name: 'Edit' }).count()
      ).toBeGreaterThanOrEqual(3)
      expect(
        await page.getByRole('button', { name: /Activate|Deactivate/ }).count()
      ).toBeGreaterThanOrEqual(3)
    })

    test('When admin clicks Edit, form opens pre-filled', async ({ page }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await page.getByRole('button', { name: 'Edit' }).first().click()
      await expect(
        page.locator('h2').filter({ hasText: 'Edit Plan' })
      ).toBeVisible()
      const nameInput = page
        .locator('.bg-white.p-6.rounded-lg.shadow input[type="text"]')
        .first()
      expect((await nameInput.inputValue()).length).toBeGreaterThan(0)
    })

    test('When admin submits new plan, plan appears in table', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await page.getByRole('button', { name: 'Create Plan' }).click()
      const nameInput = page
        .locator('.bg-white.p-6.rounded-lg.shadow input[type="text"]')
        .first()
      const planName = `E2E Plan ${Date.now()}`
      await nameInput.fill(planName)
      await page.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 })
    })

    test('When admin opens /admin/campaigns, review queue loads', async ({
      page,
    }) => {
      await page.goto('/admin/campaigns')
      await expect(
        page.getByRole('heading', { name: 'Campaign Review Queue' })
      ).toBeVisible()
    })

    test('When admin opens /admin/campaigns, pending campaigns or empty state shows', async ({
      page,
    }) => {
      await page.goto('/admin/campaigns')
      const pendingItems = page.locator('a[href^="/admin/campaigns/?slug="]')
      const emptyState = page.getByText('No campaigns pending review')
      await expect(pendingItems.first().or(emptyState)).toBeVisible()
    })

    test('When admin opens /admin/subscriptions, heading and table render', async ({
      page,
    }) => {
      await page.goto('/admin/subscriptions')
      await expect(
        page.getByRole('heading', { name: 'Organization Subscriptions' })
      ).toBeVisible()
      await expect(page.locator('table')).toBeVisible()
    })
  })

  test.describe('non-admin is denied admin area', () => {
    test.use({ storageState: OWNER_STATE })

    test('When org owner opens /admin/plans, Access Denied is shown', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      expect(await plans.open()).toBe('denied')
      await expect(
        page.getByRole('heading', { name: 'Access Denied' })
      ).toBeVisible()
    })
  })
})
