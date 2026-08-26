import { test, expect } from '@playwright/test'
import { orgReady } from './lib/ui'

const TEST_PASSWORD = 'SecurityTest123!'

// Seeded admin (admin@donate.app) is guaranteed system admin by seed-auth.sh;
const SEEDED_ADMIN = { email: 'admin@donate.app', password: 'Password123!' }

async function loginAsSeededAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(SEEDED_ADMIN.email)
  await page.locator('#password').fill(SEEDED_ADMIN.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
}
// bootstrap_system_admin() raises when any system admin already exists.
async function registerUser(
  page: import('@playwright/test').Page,
  email: string
) {
  await page.goto('/auth/register/')
  await page.locator('#fullName').fill(`User ${Date.now()}`)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(TEST_PASSWORD)
  await page.locator('#confirmPassword').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
}

async function approveRequest(
  page: import('@playwright/test').Page,
  orgName: string
) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(SEEDED_ADMIN.email)
  await page.locator('#password').fill(SEEDED_ADMIN.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  await page.goto('/admin/org-requests/')
  // Target THIS test's request card so parallel specs never cross-approve.
  // If a parallel spec already approved it, skip.
  // Wait for the card in ANY state first: a parallel/earlier approval may
  // have landed between submission and this list load.
  const anyCard = page.locator('div.rounded-lg.bg-white', {
    hasText: orgName,
  })
  await expect(anyCard).toBeVisible({ timeout: 15000 })
  const reviewButton = anyCard.getByRole('button', { name: 'Review' })
  if (!(await reviewButton.count())) return // already reviewed
  await reviewButton.click()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(
    page.getByText('Organization approved and created successfully!')
  ).toBeVisible({ timeout: 15000 })
}

test.describe.serial('Security: Organization Selection Protection', () => {
  test('When localStorage contains invalid org, it gets cleared on load', async ({
    page,
  }) => {
    // Setup user
    const userEmail = `security-test-${Date.now()}@example.com`
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Security Test User')
    await page.locator('#email').fill(userEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Manually set invalid org in localStorage
    const invalidOrgId = 'malicious-org-id-12345'
    await page.evaluate(id => {
      localStorage.setItem('supanext.currentOrgId', id)
    }, invalidOrgId)

    // Navigate to dashboard
    await page.goto('/dashboard')

    // The tampered id must be gone. A fresh user's single personal org is
    // auto-selected afterwards, so the stored value becomes a valid id (or
    // null for a zero-org user) — never the injected one.
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const storedOrgId = await page.evaluate(() =>
      localStorage.getItem('supanext.currentOrgId')
    )
    expect(storedOrgId).not.toBe(invalidOrgId)
  })

  test('When user tries to select suspended org via URL, it is blocked', async ({
    page,
  }) => {
    // org_requests are never suspended; only an active org can be suspended.
    const requesterEmail = `suspend-user-${Date.now()}@example.com`
    const orgName = `Suspended Test Org ${Date.now()}`
    const orgSlug = `suspended-test-org-${Date.now()}`

    // Requester submits a request
    await registerUser(page, requesterEmail)
    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Seeded admin approves -> active org
    await approveRequest(page, orgName)

    // Requester reads the active org id
    await page.goto('/auth/login/')
    await page.locator('#email').fill(requesterEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Fresh load so the list reflects the just-approved org
    await page.goto('/orgs')
    const href = await page
      .locator(`a[href^="/orgs/?id="]:has-text("${orgName}")`)
      .first()
      .getAttribute('href')
    const orgId = new URL(href!, 'http://localhost').searchParams.get('id')!
    expect(orgId).toBeTruthy()

    // Admin suspends the active org via the proper org-management page
    // (/admin/orgs). org_requests are never suspended; only an active org can
    // be suspended, and that control lives on the orgs admin page.
    // Suspend via seeded admin
    await loginAsSeededAdmin(page)
    await page.goto('/admin/orgs')
    await page
      .locator(`tr:has(td:has-text("${orgName}"))`)
      .getByRole('button', { name: 'Suspend' })
      .click()
    await expect(
      page.getByText('Organization status updated to suspended.')
    ).toBeVisible()

    // Requester attempts to open the suspended org directly via ?id=
    await page.goto('/auth/login/')
    await page.locator('#email').fill(requesterEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto(`/orgs/?id=${orgId}`)
    await orgReady(page)

    // Suspended org cannot become current -> selection modal shown
    // Overlay appears once the ?id= fetch resolves and the provider reacts
    await expect(
      page.getByRole('heading', { name: 'Select an Organization' })
    ).toBeVisible({ timeout: 15000 })
    // The suspended org is present in the selector but its button is disabled
    const suspendedButton = page
      .locator('button', { has: page.getByText(orgName) })
      .first()
    await expect(suspendedButton).toBeDisabled()
  })

  test('When HTML manipulation attempts currentOrg, protection works', async ({
    page,
  }) => {
    const userEmail = `xss-test-${Date.now()}@example.com`
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('XSS Test User')
    await page.locator('#email').fill(userEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Try to inject malicious HTML into localStorage
    const maliciousOrgId = '<script>alert("XSS")</script>'
    await page.evaluate(id => {
      localStorage.setItem('supanext.currentOrgId', id)
    }, maliciousOrgId)

    // Navigate to orgs page
    await page.goto('/orgs')

    // The malicious id must be cleared (and never rendered as HTML). A
    // remaining active org may be auto-selected afterwards.
    await expect(
      page.getByRole('heading', { name: 'Organizations' })
    ).toBeVisible()

    const storedOrgId = await page.evaluate(() =>
      localStorage.getItem('supanext.currentOrgId')
    )
    expect(storedOrgId).not.toBe(maliciousOrgId)
  })

  test('When multiple users access same org, isolation is maintained', async ({
    page,
  }) => {
    const orgName = `Isolation Test Org ${Date.now()}`
    const orgSlug = `isolation-test-org-${Date.now()}`
    const user1Email = `user1-isolation-${Date.now()}@example.com`
    const user2Email = `user2-isolation-${Date.now()}@example.com`

    // Requester (user1) submits a request
    await registerUser(page, user1Email)
    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Seeded admin approves -> org created; user1 is the only member
    await approveRequest(page, orgName)

    // user1 selects the org via ?id=
    await page.goto('/auth/login/')
    await page.locator('#email').fill(user1Email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // The dashboard lists org names as plain text — the id link lives on /orgs
    await page.goto('/orgs')

    const href = await page
      .locator(`a[href^="/orgs/?id="]:has-text("${orgName}")`)
      .first()
      .getAttribute('href')
    const orgId = new URL(href!, 'http://localhost').searchParams.get('id')!
    expect(orgId).toBeTruthy()

    await page.goto(`/orgs/?id=${orgId}`)
    // selectOrgById persists asynchronously after its fetch — poll, don't race
    await expect
      .poll(
        async () =>
          page.evaluate(() => localStorage.getItem('supanext.currentOrgId')),
        { timeout: 10000 }
      )
      .toBe(orgId)
    const user1OrgId = await page.evaluate(() =>
      localStorage.getItem('supanext.currentOrgId')
    )
    expect(user1OrgId).toBe(orgId)

    // Logout user1
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Sign out' }).click()

    // user2 is a different, non-member user -> the org must NOT appear for them
    await registerUser(page, user2Email)
    await page.goto('/orgs')
    const orgLinkForUser2 = page.locator(
      `a[href^="/orgs/?id="]:has-text("${orgName}")`
    )
    await expect(orgLinkForUser2).toHaveCount(0)
  })
})
