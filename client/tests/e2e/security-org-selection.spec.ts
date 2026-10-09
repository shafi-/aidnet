import { test, expect } from '@playwright/test'
import { registerViaApi } from './lib/api'
import { openAccountMenu, openNavMenu } from './lib/ui'

const TEST_PASSWORD = 'SecurityTest123!'

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

async function approveRequest(
  page: import('@playwright/test').Page,
  orgName: string
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
}

test.describe.serial('Security: Organization Selection Protection', () => {
  test('When localStorage contains invalid org, it gets cleared on load', async ({
    page,
  }) => {
    // Register via API, login via UI
    const userEmail = `security-test-${Date.now()}@example.com`
    await registerViaApi(page, userEmail, TEST_PASSWORD, 'Security Test User')
    await loginAsUser(page, userEmail, TEST_PASSWORD)

    // Manually set invalid org in localStorage
    const invalidOrgId = 'malicious-org-id-12345'
    await page.evaluate(id => {
      localStorage.setItem('supanext.currentOrgId', id)
    }, invalidOrgId)

    // Navigate to dashboard
    await page.goto('/dashboard')

    // The tampered id must be gone.  With no personal org (trigger no longer
    // creates one), the user has 0 orgs — the provider clears the invalid
    // id during restore and the dashboard shows the onboarding state (the
    // org selector only gates users who HAVE orgs to choose between).
    // Wait for either the user's name heading (1 org) or the onboarding
    // card (0 orgs) — both prove the restore ran.
    await expect(
      page.getByRole('heading', {
        name: /Security Test User|Get started on AidNet/,
      })
    ).toBeVisible({ timeout: 10000 })

    const storedOrgId = await page.evaluate(() =>
      localStorage.getItem('supanext.currentOrgId')
    )
    expect(storedOrgId).not.toBe(invalidOrgId)
  })

  test('When user tries to select suspended org via URL, it is blocked', async ({
    page,
  }) => {
    const requesterEmail = `suspend-user-${Date.now()}@example.com`
    const orgName = `Suspended Test Org ${Date.now()}`
    const orgSlug = `suspended-test-org-${Date.now()}`

    // Register via API, login via UI, submit request
    await registerViaApi(
      page,
      requesterEmail,
      TEST_PASSWORD,
      `User ${Date.now()}`
    )
    await loginAsUser(page, requesterEmail, TEST_PASSWORD)

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Seeded admin approves -> active org
    await approveRequest(page, orgName)

    // Requester reads the active org id
    await loginAsUser(page, requesterEmail, TEST_PASSWORD)

    // Fresh load so the list reflects the just-approved org
    await page.goto('/orgs')
    const href = await page
      .locator(`a[href^="/orgs/?id="]:has-text("${orgName}")`)
      .first()
      .getAttribute('href')
    const orgId = new URL(href!, 'http://localhost').searchParams.get('id')!
    expect(orgId).toBeTruthy()

    // Admin suspends the active org via the proper org-management page
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
    await loginAsUser(page, requesterEmail, TEST_PASSWORD)

    await page.goto(`/orgs/?id=${orgId}`)

    // Suspended org cannot become current — the orgs page renders and
    // localStorage must NOT hold the suspended org id.
    await expect(
      page.getByRole('heading', { name: 'Organizations' })
    ).toBeVisible()
    // Suspended badge confirms the org is listed but blocked
    await expect(
      page.locator('span:has-text("Suspended")').first()
    ).toBeVisible()
    const storedOrgId = await page.evaluate(() =>
      localStorage.getItem('supanext.currentOrgId')
    )
    expect(storedOrgId).not.toBe(orgId)
  })

  test('When HTML manipulation attempts currentOrg, protection works', async ({
    page,
  }) => {
    const userEmail = `xss-test-${Date.now()}@example.com`
    await registerViaApi(page, userEmail, TEST_PASSWORD, 'XSS Test User')
    await loginAsUser(page, userEmail, TEST_PASSWORD)

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

    // Requester (user1) registers via API, login via UI, submits a request
    await registerViaApi(page, user1Email, TEST_PASSWORD, `User1 ${Date.now()}`)
    await loginAsUser(page, user1Email, TEST_PASSWORD)

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Seeded admin approves -> org created; user1 is the only member
    await approveRequest(page, orgName)

    // user1 selects the org via ?id=
    await loginAsUser(page, user1Email, TEST_PASSWORD)

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
      .poll(async () =>
        page.evaluate(() => localStorage.getItem('supanext.currentOrgId'))
      )
      .toBe(orgId)
    const user1OrgId = await page.evaluate(() =>
      localStorage.getItem('supanext.currentOrgId')
    )
    expect(user1OrgId).toBe(orgId)

    // Logout user1
    await page.goto('/profile')
    await openNavMenu(page)
    await openAccountMenu(page)
    // Desktop dropdown renders a Radix menuitem; mobile drawer a button.
    await page
      .getByRole('menuitem', { name: 'Sign out' })
      .or(page.getByRole('button', { name: 'Sign out' }))
      .click()

    // user2 is a different, non-member user -> the org must NOT appear for them
    await registerViaApi(page, user2Email, TEST_PASSWORD, `User2 ${Date.now()}`)
    await loginAsUser(page, user2Email, TEST_PASSWORD)

    await page.goto('/orgs')
    const orgLinkForUser2 = page.locator(
      `a[href^="/orgs/?id="]:has-text("${orgName}")`
    )
    await expect(orgLinkForUser2).toHaveCount(0)
  })
})
