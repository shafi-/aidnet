import { test, expect } from '@playwright/test'
import { expectOrgProvisioned, registerViaApi } from './lib/api'

const TEST_PASSWORD = 'TestPass123!'

const SEEDED_ADMIN = { email: 'admin@donate.app', password: 'Password123!' }

async function loginAsSeededAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(SEEDED_ADMIN.email)
  await page.locator('#password').fill(SEEDED_ADMIN.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

async function loginAsUser(
  page: import('@playwright/test').Page,
  email: string,
  password: string
) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

async function submitOrgRequest(
  page: import('@playwright/test').Page,
  name: string,
  slug: string
) {
  await page.goto('/org/request')
  await page.getByPlaceholder('My Organization').fill(name)
  await page.getByPlaceholder('my-organization').fill(slug)
  await page.getByRole('button', { name: 'Submit for Review' }).click()
  await expect(page.getByText('Request Pending Review')).toBeVisible()
}

async function approveRequestAsAdmin(
  page: import('@playwright/test').Page,
  orgName: string,
  requesterCreds?: { email: string; password: string }
) {
  await loginAsSeededAdmin(page)

  await page.goto('/admin/org-requests/')
  const anyCard = page.locator('div.rounded-lg.bg-white', {
    hasText: orgName,
  })
  await expect(anyCard).toBeVisible()
  const reviewButton = anyCard.getByRole('button', { name: 'Review' })
  if (!(await reviewButton.count())) return // already reviewed
  await reviewButton.click()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(
    page.getByText('Organization approved and created successfully!')
  ).toBeVisible()

  // CONTRACT: provisioning outcome asserted at creation site, not via UI
  if (requesterCreds) {
    await expectOrgProvisioned(page.request, requesterCreds, orgName)
  }
}

test.describe('Organization Request Submission', () => {
  test('When user submits org request, it shows as pending', async ({
    page,
  }) => {
    const email = `requester-${Date.now()}@example.com`
    await registerViaApi(page, email, TEST_PASSWORD, `User ${Date.now()}`)
    await loginAsUser(page, email, TEST_PASSWORD)

    await submitOrgRequest(
      page,
      `Test Org ${Date.now()}`,
      `test-org-${Date.now()}`
    )
  })

  test('When user has pending request, cannot submit another', async ({
    page,
  }) => {
    const email = `requester-${Date.now()}@example.com`
    await registerViaApi(page, email, TEST_PASSWORD, `User ${Date.now()}`)
    await loginAsUser(page, email, TEST_PASSWORD)

    await submitOrgRequest(page, 'First Org', `first-org-${Date.now()}`)

    // Returning to the request page should still show pending, not the form
    await page.goto('/org/request')
    await expect(page.getByText('Request Pending Review')).toBeVisible()
    await expect(
      page.locator('input[placeholder="My Organization"]')
    ).not.toBeVisible()
  })
})

test.describe('Organizations List reflects Requests', () => {
  test('When user has pending request, /orgs shows empty state with request CTA', async ({
    page,
  }) => {
    const email = `requester-${Date.now()}@example.com`
    await registerViaApi(page, email, TEST_PASSWORD, `User ${Date.now()}`)
    await loginAsUser(page, email, TEST_PASSWORD)

    await submitOrgRequest(page, 'Test Org', `test-org-${Date.now()}`)

    await page.goto('/orgs')
    // With no personal org auto-created, the list shows the request CTA
    await expect(
      page.getByRole('link', { name: 'Request Organization' }).first()
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Create Organization' })
    ).not.toBeVisible()
  })

  test('When user has an approved active org, it appears as a selectable link', async ({
    page,
  }) => {
    const email = `owner-${Date.now()}@example.com`
    const orgName = `Active Org ${Date.now()}`
    const slug = `active-org-${Date.now()}`

    const creds = { email, password: TEST_PASSWORD }
    await registerViaApi(page, email, TEST_PASSWORD, `User ${Date.now()}`)
    await loginAsUser(page, email, TEST_PASSWORD)

    await submitOrgRequest(page, orgName, slug)
    await approveRequestAsAdmin(page, orgName, creds)

    // Requester now has an active org
    await loginAsUser(page, email, TEST_PASSWORD)

    await page.goto('/orgs')
    const orgLink = page.locator(`a[href^="/orgs/?id="]:has-text("${orgName}")`)
    await expect(orgLink).toBeVisible()
  })
})

test.describe.serial('Suspended Organization Behavior', () => {
  // Shared state captured from the first (setup) test, reused by later tests.
  let orgId: string
  let requesterEmail: string
  const requesterPassword = TEST_PASSWORD

  test('setup: create an active org (no suspend UI exists yet)', async ({
    page,
  }) => {
    requesterEmail = `suspended-owner-${Date.now()}@example.com`
    const orgName = `Suspended Org ${Date.now()}`
    const slug = `suspended-org-${Date.now()}`

    // Requester submits a request (register via API, login via UI)
    await registerViaApi(
      page,
      requesterEmail,
      requesterPassword,
      `User ${Date.now()}`
    )
    await loginAsUser(page, requesterEmail, requesterPassword)

    await submitOrgRequest(page, orgName, slug)

    // Seeded admin approves -> org is created and active
    await approveRequestAsAdmin(page, orgName, {
      email: requesterEmail,
      password: requesterPassword,
    })

    // Requester reads the active org id from the orgs list link
    await loginAsUser(page, requesterEmail, requesterPassword)

    await page.goto('/orgs')
    const href = await page
      .locator(`a[href^="/orgs/?id="]:has-text("${orgName}")`)
      .first()
      .getAttribute('href')
    orgId = new URL(href!, 'http://localhost').searchParams.get('id')!
    expect(orgId).toBeTruthy()

    // Admin suspends the active org via the proper org-management page
    // (/admin/orgs). org_requests are never suspended; only an active org can
    // be suspended, and that control now lives on the orgs admin page.
    await approveRequestAsAdmin(page, orgName) // logs in as the seeded admin

    await page.goto('/admin/orgs')
    const suspendButton = page
      .locator(`tr:has(td:has-text("${orgName}"))`)
      .getByRole('button', { name: 'Suspend' })
    await expect(suspendButton).toBeVisible()
    await suspendButton.click()
    await expect(
      page.getByText('Organization status updated to suspended.')
    ).toBeVisible()

    // Requester returns for the behavior tests
    await loginAsUser(page, requesterEmail, requesterPassword)
  })

  test('When suspended org listed, it shows Suspended badge and is NOT a link', async ({
    page,
  }) => {
    await loginAsUser(page, requesterEmail, requesterPassword)

    await page.goto('/orgs')

    // Suspended orgs render as a plain heading, never as a selectable link
    const suspendedLink = page.locator(
      `a[href^="/orgs/?id="]:has-text("Suspended Org")`
    )
    await expect(suspendedLink).toHaveCount(0)

    // The org name is present with a Suspended badge
    await expect(page.getByText('Suspended Org').first()).toBeVisible()
    await expect(page.getByText('Suspended').first()).toBeVisible()
  })

  test('When localStorage holds a suspended org id, it is cleared on load', async ({
    page,
  }) => {
    await loginAsUser(page, requesterEmail, requesterPassword)

    await page.evaluate(
      id => localStorage.setItem('supanext.currentOrgId', id),
      orgId
    )
    await page.goto('/dashboard')

    // The suspended id must be gone. Any remaining active org may be
    // auto-selected afterwards. Cleanup is async; poll for it.
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem('supanext.currentOrgId'))
      )
      .not.toBe(orgId)
  })

  test('When user opens ?id= of a suspended org, it is not selected and selector blocks it', async ({
    page,
  }) => {
    await loginAsUser(page, requesterEmail, requesterPassword)

    await page.goto(`/orgs/?id=${orgId}`)

    // Suspended org cannot become current -> selection modal is shown
    // Overlay appears once the ?id= fetch resolves and the provider reacts
    await expect(
      page.getByRole('heading', { name: 'Select an Organization' })
    ).toBeVisible()

    // The suspended org appears in the selector but its button is disabled
    const suspendedButton = page
      .locator('button', { has: page.getByText('Suspended Org') })
      .first()
    await expect(suspendedButton).toBeDisabled()
  })
})
