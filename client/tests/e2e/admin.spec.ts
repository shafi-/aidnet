import { test, expect } from '@playwright/test'

// Seeded admin is guaranteed to be THE system admin (seed-auth.sh);
// bootstrap_system_admin() raises when any system admin already exists.
const ADMIN_PASSWORD = 'Password123!'
const ADMIN_EMAIL = 'admin@donate.app'

async function setupSystemAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
}

test.describe.serial('Admin Pages - Org Request Workflow', () => {
  test('When system admin loads /admin, system stats are shown', async ({
    page,
  }) => {
    await setupSystemAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })

    await expect(page.locator('h1')).toContainText('System Admin')
    await expect(page.locator('text=Organizations').first()).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('text=Users').first()).toBeVisible()
    await expect(page.locator('text=Members').first()).toBeVisible()
    await expect(page.locator('text=Recent Signups')).toBeVisible()
  })

  test('When system admin views /admin, Review Orgs link is shown', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('System Admin')
    await expect(page.getByRole('link', { name: 'Review Orgs' })).toBeVisible({
      timeout: 10000,
    })
  })

  test('When admin clicks Review Orgs, navigates to /admin/org-requests', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('System Admin')
    await page.getByRole('link', { name: 'Review Orgs' }).click()
    await expect(page).toHaveURL(/\/admin\/org-requests/)
  })

  test('When system admin loads /admin/org-requests, requests list renders', async ({
    page,
  }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

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

    // Create requester and submit request
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Approve Test User')
    await page.locator('#email').fill(requesterEmail)
    await page.locator('#password').fill('TestPass123!')
    await page.locator('#confirmPassword').fill('TestPass123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Login as system admin and approve
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

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
    ).toBeVisible({ timeout: 15000 })

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

    // Create requester and submit request
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Reject Test User')
    await page.locator('#email').fill(requesterEmail)
    await page.locator('#password').fill('TestPass123!')
    await page.locator('#confirmPassword').fill('TestPass123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Login as system admin and reject
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

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

    await expect(page.getByText('Organization request rejected.')).toBeVisible({
      timeout: 15000,
    })

    // Verify THIS request's card shows as rejected with the reason
    // (older runs' cards may repeat the same free-text reason)
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

    // Create requester and submit request
    const requesterEmail = `status-test-${Date.now()}@example.com`
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Status Test User')
    await page.locator('#email').fill(requesterEmail)
    await page.locator('#password').fill('TestPass123!')
    await page.locator('#confirmPassword').fill('TestPass123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()

    // Login as system admin and approve
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/admin/org-requests/')
    const approveCard = page.locator('div.rounded-lg.bg-white', {
      hasText: orgName,
    })
    await expect(approveCard).toBeVisible({ timeout: 15000 })
    await approveCard.getByRole('button', { name: 'Review' }).click()
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(
      page.getByText('Organization approved and created successfully!')
    ).toBeVisible({ timeout: 15000 })

    // Suspend and reactivate via the proper org-management page (/admin/orgs)
    await page.goto('/admin/orgs')
    const orgRow = page.locator(`tr:has(td:has-text("${orgName}"))`)
    const suspendButton = orgRow.getByRole('button', { name: 'Suspend' })
    await expect(suspendButton).toBeVisible({ timeout: 15000 })
    await suspendButton.click()

    await expect(
      page.getByText('Organization status updated to suspended.')
    ).toBeVisible()

    // Reactivate the org
    const reactivateButton = page
      .locator(`tr:has(td:has-text("${orgName}"))`)
      .getByRole('button', { name: 'Activate' })
    await expect(reactivateButton).toBeVisible({ timeout: 15000 })
    await reactivateButton.click()

    await expect(
      page.getByText('Organization status updated to active.')
    ).toBeVisible()
  })
})
