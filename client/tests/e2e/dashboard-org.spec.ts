import { test, expect } from '@playwright/test'
import { USERS, signIn, getOrgFeatures } from './lib/api'
import { DashboardPage } from './pages/OrgPages'

test.use({ storageState: `${'tests/e2e'}/.auth/orgOwner.json` })

let features: string[] = []

test.beforeAll(async ({ request }) => {
  const session = await signIn(
    request,
    USERS.orgOwner.email,
    USERS.orgOwner.password
  )
  features = await getOrgFeatures(request, session)
})

test.describe('OrgDashboard', () => {
  test('When owner opens dashboard, org name and Billing tab show', async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.open()

    await expect(
      page.locator('.bg-white.rounded-lg.shadow h1').first()
    ).toBeVisible()
    // Billing always visible to owners regardless of subscription
    await expect(dashboard.tab('Billing')).toBeVisible()
  })

  test('When members feature active, Members tab shows member list', async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.open()
    const membersTab = dashboard.tab('Members')

    test.skip(
      !features.includes('members'),
      'seeded plan does not grant members — cannot exercise the members flow'
    )

    await membersTab.click()
    await expect(page.locator('ul')).toBeVisible()
  })

  test('When members feature active, add-member form shows', async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.open()
    const membersTab = dashboard.tab('Members')

    test.skip(
      !features.includes('members'),
      'seeded plan does not grant members — cannot exercise the members flow'
    )

    await membersTab.click()
    await expect(page.getByPlaceholder('Add member by email...')).toBeVisible()
  })

  test('When settings feature active, Settings tab shows org form', async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.open()
    const settingsTab = dashboard.tab('Settings')

    test.skip(
      !features.includes('settings'),
      'seeded plan does not grant settings — cannot exercise the settings flow'
    )

    await settingsTab.click()
    await expect(page.getByLabel('Organization Name')).toBeVisible()
    await expect(page.getByLabel('Web address')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Save Changes' })
    ).toBeVisible()
  })

  test('When settings feature active, owner can save org settings', async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.open()
    const settingsTab = dashboard.tab('Settings')

    test.skip(
      !features.includes('settings'),
      'seeded plan does not grant settings — cannot exercise the settings flow'
    )

    await settingsTab.click()

    const nameInput = page.getByLabel('Organization Name')
    const original = await nameInput.inputValue()
    await nameInput.fill(`${original} Updated`)
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Saved!')).toBeVisible()

    await nameInput.fill(original)
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Saved!')).toBeVisible()
  })
})
