import { test, expect } from '@playwright/test'
import { registerViaApi } from './lib/api'

const ADMIN_PASSWORD = 'Password123!'
const ADMIN_EMAIL = 'admin@donate.app'
const TEST_PASSWORD = 'TestPass123!'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
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

test.describe.serial('Admin Pages - Org Request Workflow', () => {
  test('When system admin loads /admin, system stats are shown', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })

    await expect(page.locator('h1')).toContainText('System Admin')
    await expect(page.locator('text=Organizations').first()).toBeVisible()
    await expect(page.locator('text=Users').first()).toBeVisible()
    await expect(page.locator('text=Members').first()).toBeVisible()
    await expect(page.locator('text=Recent Signups')).toBeVisible()
  })

  test('When system admin views /admin, Review Orgs link is shown', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('System Admin')
    await expect(page.getByRole('link', { name: 'Review Orgs' })).toBeVisible()
  })

  test('When admin clicks Review Orgs, navigates to /admin/org-requests', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('System Admin')
    await page.getByRole('link', { name: 'Review Orgs' }).click()
    await expect(page).toHaveURL(/\/admin\/org-requests/)
  })

  test('When system admin loads /admin/org-requests, requests list renders', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/org-requests/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('Organization Requests')
    // Status filter renders as toggle buttons: All (n), Pending (n), ...
    await expect(
      page.getByRole('button', { name: /^All \(\d+\)$/ })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Pending \(\d+\)$/ })
    ).toBeVisible()
  })

  test('When system admin approves request, organization is created', async ({
    page,
  }) => {
    const requesterEmail = `approve-test-${Date.now()}@example.com`
    const orgName = `Approve Test Org ${Date.now()}`
    const orgSlug = `approve-test-org-${Date.now()}`

    // Create requester via API, login via UI, submit request
    await registerViaApi(
      page,
      requesterEmail,
      TEST_PASSWORD,
      'Approve Test User'
    )
    await loginAsUser(page, requesterEmail, TEST_PASSWORD)

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Login as system admin and approve
    await loginAsAdmin(page)

    await page.goto('/admin/org-requests/')
    // Target THIS request card (list + modal both render the name)
    const card = page.locator('div.rounded-lg.bg-white', { hasText: orgName })
    await expect(card).toBeVisible()

    // Click Review button
    await card.getByRole('button', { name: 'Review' }).click()
    await expect(page.getByText('Review Organization Request')).toBeVisible()
    await expect(page.getByRole('heading', { name: orgName })).toBeVisible()

    // Approve
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(
      page.getByText('Organization approved and created successfully!')
    ).toBeVisible()

    // Verify request shows as approved (filter count includes it)
    await expect(
      page.getByRole('button', { name: /^Approved \([1-9]/ })
    ).toBeVisible()
  })

  test('When system admin rejects request with reason, shows rejection', async ({
    page,
  }) => {
    const requesterEmail = `reject-test-${Date.now()}@example.com`
    const orgName = `Reject Test Org ${Date.now()}`
    const orgSlug = `reject-test-org-${Date.now()}`
    const rejectionReason = 'Not suitable for our platform'

    // Create requester via API, login via UI, submit request
    await registerViaApi(
      page,
      requesterEmail,
      TEST_PASSWORD,
      'Reject Test User'
    )
    await loginAsUser(page, requesterEmail, TEST_PASSWORD)

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Login as system admin and reject
    await loginAsAdmin(page)

    await page.goto('/admin/org-requests/')
    const rejectCard = page.locator('div.rounded-lg.bg-white', {
      hasText: orgName,
    })
    await expect(rejectCard).toBeVisible()

    // Click Review and reject with reason
    await rejectCard.getByRole('button', { name: 'Review' }).click()
    await page
      .getByPlaceholder('Explain why this request is being rejected')
      .fill(rejectionReason)
    await page.getByRole('button', { name: 'Reject', exact: true }).click()

    await expect(page.getByText('Organization request rejected.')).toBeVisible()

    // Verify THIS request's card shows as rejected with the reason
    await expect(
      rejectCard.getByText(`Rejection Reason: ${rejectionReason}`)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Rejected \([1-9]/ })
    ).toBeVisible()
  })

  test('When system_admin manages org status, can suspend and reactivate', async ({
    page,
  }) => {
    const orgName = `Status Test Org ${Date.now()}`
    const orgSlug = `status-test-org-${Date.now()}`

    // Create requester via API, login via UI, submit request
    const requesterEmail = `status-test-${Date.now()}@example.com`
    await registerViaApi(
      page,
      requesterEmail,
      TEST_PASSWORD,
      'Status Test User'
    )
    await loginAsUser(page, requesterEmail, TEST_PASSWORD)

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()

    // Login as system admin and approve
    await loginAsAdmin(page)

    await page.goto('/admin/org-requests/')
    const approveCard = page.locator('div.rounded-lg.bg-white', {
      hasText: orgName,
    })
    await expect(approveCard).toBeVisible()
    await approveCard.getByRole('button', { name: 'Review' }).click()
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(
      page.getByText('Organization approved and created successfully!')
    ).toBeVisible()

    // Suspend and reactivate via the proper org-management page (/admin/orgs)
    await page.goto('/admin/orgs')
    const orgRow = page.locator(`tr:has(td:has-text("${orgName}"))`)
    const suspendButton = orgRow.getByRole('button', { name: 'Suspend' })
    await expect(suspendButton).toBeVisible()
    await suspendButton.click()

    await expect(
      page.getByText('Organization status updated to suspended.')
    ).toBeVisible()

    // Reactivate the org
    const reactivateButton = page
      .locator(`tr:has(td:has-text("${orgName}"))`)
      .getByRole('button', { name: 'Activate' })
    await expect(reactivateButton).toBeVisible()
    await reactivateButton.click()

    await expect(
      page.getByText('Organization status updated to active.')
    ).toBeVisible()
  })
})
