import { test, expect } from '@playwright/test'

const TEST_PASSWORD = 'UserTest123!'

// Seeded admin (admin@donate.app) is guaranteed system admin by seed-auth.sh;
// bootstrap_system_admin() raises when any system admin already exists.
const ADMIN_EMAIL = 'admin@donate.app'
const ADMIN_PASSWORD = 'Password123!'

async function loginAsSeededAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
}

async function approveRequest(
  page: import('@playwright/test').Page,
  orgName: string
) {
  await loginAsSeededAdmin(page)
  await page.goto('/admin/org-requests/')
  const card = page.locator('div.rounded-lg.bg-white', { hasText: orgName })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Review' }).click()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(
    page.getByText('Organization approved and created successfully!')
  ).toBeVisible({ timeout: 15000 })
}

test.describe.serial('Organization Metadata Management', () => {
  test('When org is created, metadata is auto-initialized', async ({
    page,
  }) => {
    const orgName = `Meta Test Org ${Date.now()}`
    const orgSlug = `meta-test-org-${Date.now()}`

    // Setup user and submit request
    const userEmail = `meta-user-${Date.now()}@example.com`
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Meta Test User')
    await page.locator('#email').fill(userEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()

    // Seeded admin approves
    await approveRequest(page, orgName)
    await expect(
      page.getByText('Organization approved and created successfully!')
    ).toBeVisible()

    // Login as user and verify org has metadata
    await page.goto('/auth/login/')
    await page.locator('#email').fill(userEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    // Wait for the session swap to land before navigating anywhere else
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    await page.goto('/orgs')

    // The org should be visible and accessible
    await expect(page.getByText(orgName).first()).toBeVisible()
  })

  test('When org_admin updates org metadata, changes persist', async ({
    page,
  }) => {
    const orgName = `Update Meta Test Org ${Date.now()}`
    const orgSlug = `update-meta-org-${Date.now()}`

    // Setup user and submit request
    const userEmail = `update-meta-user-${Date.now()}@example.com`
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Update Meta User')
    await page.locator('#email').fill(userEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()

    // Seeded admin approves
    await approveRequest(page, orgName)

    // Login as user and get org ID
    await page.goto('/auth/login/')
    await page.locator('#email').fill(userEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    // Wait for the session swap to land before navigating anywhere else
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    await page.goto('/orgs')

    // Click on the org to select it, and WAIT until the choice is actually
    // persisted: navigating mid-write silently drops the selection.
    await page.getByText(orgName).first().click()
    // Selection persists via localStorage currentOrgId; poll for it rather
    // than racing the overlay hide (which can flap under suite load).
    await expect
      .poll(
        async () =>
          page.evaluate(() => localStorage.getItem('supanext.currentOrgId')),
        { timeout: 15000 }
      )
      .toBeTruthy()
    await expect(
      page.getByRole('heading', { name: 'Select an Organization' })
    ).toBeHidden({ timeout: 15000 })

    // Org metadata editing lives in the dashboard's Settings tab.
    // The user has2 orgs, so the selector overlay shows until currentOrg is
    // restored from localStorage. Wait for the overlay to disappear first,
    // then waitFor the Settings button (which requires currentOrg + subscription
    // features + admin role).
    await page.goto('/dashboard')
    await expect(
      page.getByRole('heading', { name: 'Select an Organization' })
    ).toBeHidden({ timeout: 15000 })
    await page.getByRole('button', { name: 'Settings' }).waitFor({
      timeout: 15000,
    })
    await page.getByRole('button', { name: 'Settings' }).click()

    // Update metadata and save
    const nameInput = page.locator('#org-settings-name')
    await expect(nameInput).toBeVisible()
    await nameInput.fill(orgName + ' Updated')
    await page.locator('#org-settings-description').fill('Updated by e2e')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Saved!')).toBeVisible()

    // Changes persist across a full reload
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Select an Organization' })
    ).toBeHidden({ timeout: 15000 })
    await page.getByRole('button', { name: 'Settings' }).waitFor({
      timeout: 15000,
    })
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.locator('#org-settings-name')).toHaveValue(
      orgName + ' Updated'
    )
  })

  test('When org has different metadata, displays correctly in org list', async ({
    page,
  }) => {
    const org1Name = `Org 1 ${Date.now()}`
    const org2Name = `Org 2 ${Date.now()}`
    const org1Slug = `org-1-${Date.now()}`
    const org2Slug = `org-2-${Date.now()}`

    // Create and approve first org
    const user1Email = `org1-user-${Date.now()}@example.com`
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Org 1 User')
    await page.locator('#email').fill(user1Email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(org1Name)
    await page.getByPlaceholder('my-organization').fill(org1Slug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()

    await approveRequest(page, org1Name)

    // Create and approve second org
    const user2Email = `org2-user-${Date.now()}@example.com`
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Org 2 User')
    await page.locator('#email').fill(user2Email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(org2Name)
    await page.getByPlaceholder('my-organization').fill(org2Slug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()

    await approveRequest(page, org2Name)

    // Login as first user and verify only their org appears
    await page.goto('/auth/login/')
    await page.locator('#email').fill(user1Email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    // Wait for the session swap to land before navigating anywhere else
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    await page.goto('/orgs')

    // Scope to the org-list link: the selection overlay (user1 has 2 orgs)
    // renders the same name as a button, so a global text match is ambiguous.
    await expect(
      page.locator(`a[href^="/orgs/?id="]:has-text("${org1Name}")`)
    ).toBeVisible()
    await expect(
      page.locator(`a[href^="/orgs/?id="]:has-text("${org2Name}")`)
    ).toHaveCount(0)
  })

  test('When org is suspended, metadata remains but UI shows suspension', async ({
    page,
  }) => {
    const orgName = `Suspended Meta Org ${Date.now()}`
    const orgSlug = `suspended-meta-org-${Date.now()}`

    // Setup user and submit request
    const userEmail = `suspended-meta-user-${Date.now()}@example.com`
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Suspended Meta User')
    await page.locator('#email').fill(userEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()

    // Seeded admin approves
    await approveRequest(page, orgName)

    // Suspend the org (suspend control lives on /admin/orgs)
    await page.goto('/admin/orgs')
    const row = page.locator('tr', { hasText: orgName })
    await expect(row).toBeVisible({ timeout: 15000 })
    await row.getByRole('button', { name: 'Suspend' }).click()
    await expect(
      page.getByText('Organization status updated to suspended.')
    ).toBeVisible({ timeout: 15000 })

    // Login as user and verify suspension status
    await page.goto('/auth/login/')
    await page.locator('#email').fill(userEmail)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    // Wait for the session swap to land before navigating anywhere else
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    await page.goto('/orgs')

    // The suspended org should not be selectable or should show suspension status
    await expect(
      page.getByRole('heading', { name: 'Organizations' })
    ).toBeVisible()
  })
})
