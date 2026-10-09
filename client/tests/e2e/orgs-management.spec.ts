import { test, expect } from '@playwright/test'
import { gotoStable } from './lib/ui'

const OWNER_STATE = 'tests/e2e/.auth/orgOwner.json'

test.use({ storageState: OWNER_STATE })

test.describe('Orgs Page - Updated for Request Flow', () => {
  test('When owner loads /orgs, shows request CTA instead of an inline Create button', async ({
    page,
  }) => {
    await gotoStable(page, '/orgs')

    await expect(
      page.getByRole('link', { name: 'Request an organization' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Create Organization' })
    ).not.toBeVisible()
  })

  test('When owner has orgs, they are listed as selectable links', async ({
    page,
  }) => {
    await gotoStable(page, '/orgs')

    // handle_new_user auto-creates a personal org per user, so the list is
    // never empty; each org renders as a link with its name heading.
    const orgLinks = page.locator('a[href^="/orgs/?id="]')
    await expect(orgLinks.first()).toBeVisible()
    await expect(orgLinks.first()).toContainText(/.+/)
  })

  test('When owner clicks Request Organization, navigates to request page', async ({
    page,
  }) => {
    await gotoStable(page, '/orgs')

    await page.getByRole('link', { name: 'Request an organization' }).click()
    await expect(page).toHaveURL(/\/org\/request/)
    await expect(
      page.getByRole('heading', { name: 'Request an organization' })
    ).toBeVisible()
    await expect(
      page.getByText('Submit your organization for review and approval')
    ).toBeVisible()
  })

  test('When owner has existing orgs, shows them as clickable links', async ({
    page,
  }) => {
    await gotoStable(page, '/orgs')

    const orgLinks = page.locator('a[href^="/orgs/?id="]')
    await expect(orgLinks.first()).toBeVisible()
    expect(await orgLinks.count()).toBeGreaterThanOrEqual(1)
  })

  test('When owner clicks an org card, that org is selected', async ({
    page,
  }) => {
    await gotoStable(page, '/orgs')

    const orgLink = page.locator('a[href^="/orgs/?id="]').first()
    const href = await orgLink.getAttribute('href')
    await orgLink.click()

    // Page selects the org then cleans the URL via replaceState
    await expect(page).toHaveURL(/\/orgs\/?$/)
    // Org selection effect persists the id asynchronously
    const expectedId = new URL(href!, 'http://localhost').searchParams.get('id')
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem('supanext.currentOrgId'))
      )
      .toBe(expectedId)
  })
})
