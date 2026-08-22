import { test, expect } from '@playwright/test'

const OWNER_STATE = 'tests/e2e/.auth/orgOwner.json'

test.use({ storageState: OWNER_STATE })

test.describe('Orgs Page', () => {
  test('When owner loads /orgs, existing orgs are shown as links', async ({ page }) => {
    await page.goto('/orgs')

    const orgLinks = page.locator('a[href^="/orgs/?id="]')
    await expect(orgLinks.first()).toBeVisible()
    expect(await orgLinks.count()).toBeGreaterThanOrEqual(1)
  })

  test('When owner clicks Create Organization, form fields appear', async ({ page }) => {
    await page.goto('/orgs')

    await page.getByRole('button', { name: 'Create Organization' }).click()
    await expect(page.getByText('Organization Name', { exact: true })).toBeVisible()
    await expect(page.getByText('Description', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible()
  })

  test('When owner submits valid org form, org is created and listed', async ({
    page,
  }) => {
    await page.goto('/orgs')

    await page.getByRole('button', { name: 'Create Organization' }).click()

    const orgName = `E2E Org ${Date.now()}`
    const nameInput = page.locator('text=Organization Name').locator('..').locator('input').first()
    const slugInput = page.locator('text=Slug').locator('..').locator('input').first()
    const descInput = page.locator('text=Description').locator('..').locator('textarea').first()

    await nameInput.fill(orgName)
    await slugInput.fill(`e2e-org-${Date.now()}`)
    await descInput.fill('Created by e2e test')

    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Success path redirects to the new org's dashboard.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // The created org now appears in the owner's organization list.
    await page.goto('/orgs')
    await expect(page.getByText(orgName)).toBeVisible()
  })

  test('When owner clicks an org card, that org is selected', async ({ page }) => {
    await page.goto('/orgs')

    const orgLink = page.locator('a[href^="/orgs/?id="]').first()
    const href = await orgLink.getAttribute('href')
    await orgLink.click()
    // Page selects the org then cleans the URL via replaceState
    await expect(page).toHaveURL(/\/orgs\/?$/)
    // Org selection effect persists the id asynchronously
    const expectedId = new URL(href!, 'http://localhost').searchParams.get('id')
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('supanext.currentOrgId')))
      .toBe(expectedId)
  })
})
