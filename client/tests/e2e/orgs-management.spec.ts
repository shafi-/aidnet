import { test, expect } from '@playwright/test'
import { gotoStable } from './lib/ui'

const OWNER_STATE = 'tests/e2e/.auth/orgOwner.json'

test.use({ storageState: OWNER_STATE })

test.describe('Orgs Page - Updated for Request Flow', () => {
  test('When owner loads /manage/orgs, shows request CTA instead of an inline Create button', async ({
    page,
  }) => {
    await gotoStable(page, '/manage/orgs')

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
    await gotoStable(page, '/manage/orgs')

    // handle_new_user auto-creates a personal org per user, so the list is
    // never empty; each org renders as a link with its name heading.
    const orgLinks = page.locator('a[href^="/manage/orgs/?id="]')
    await expect(orgLinks.first()).toBeVisible()
    await expect(orgLinks.first()).toContainText(/.+/)
  })

  test('When owner clicks Request Organization, navigates to request page', async ({
    page,
  }) => {
    await gotoStable(page, '/manage/orgs')

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
    await gotoStable(page, '/manage/orgs')

    const orgLinks = page.locator('a[href^="/manage/orgs/?id="]')
    await expect(orgLinks.first()).toBeVisible()
    expect(await orgLinks.count()).toBeGreaterThanOrEqual(1)
  })

  test('When owner clicks an org card, that org is selected', async ({
    page,
  }) => {
    await gotoStable(page, '/manage/orgs')

    const orgLink = page.locator('a[href^="/manage/orgs/?id="]').first()
    const href = await orgLink.getAttribute('href')
    await orgLink.click()

    // Selecting via ?id= enters the org's workspace (59a7ed8): the router
    // lands on /dashboard. It races the ?id cleanup replaceState, so the
    // dashboard URL is the assertion — not the intermediate /manage/orgs one.
    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 15000 })
    // Org selection effect persists the id asynchronously
    const expectedId = new URL(href!, 'http://localhost').searchParams.get('id')
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem('supanext.currentOrgId'))
      )
      .toBe(expectedId)
  })
})
