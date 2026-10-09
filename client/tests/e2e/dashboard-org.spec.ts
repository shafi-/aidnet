import { test, expect } from '@playwright/test'
import { USERS, signIn, getOrgFeatures } from './lib/api'
import { ConsolePage } from './pages/OrgPages'

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

test.describe('Org workspace routes', () => {
  test('When owner opens the workspace, the org switcher and overview render', async ({
    page,
  }) => {
    const workspace = new ConsolePage(page)
    await workspace.open()

    await expect(page.locator('[data-org-switcher]:visible')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Overview', exact: true })
    ).toBeVisible()
  })

  test('When members feature active, /dashboard/members shows one merged list', async ({
    page,
  }) => {
    const workspace = new ConsolePage(page)

    test.skip(
      !features.includes('members'),
      'seeded plan does not grant members — cannot exercise the members flow'
    )

    await workspace.open('/dashboard/members')

    // The merged list replaces the old Members/Pending Invites sub-tabs.
    await expect(
      page.getByRole('button', { name: /Pending Invites/ })
    ).toHaveCount(0)
    await expect(page.getByPlaceholder('Add member by email...')).toBeVisible()
    await expect(page.getByPlaceholder('Invite by email...')).toBeVisible()
    await expect(page.locator('.divide-y > div').first()).toBeVisible()
  })

  test('When owner invites an email, the panel exposes the code and a copyable join link', async ({
    page,
    context,
  }) => {
    const workspace = new ConsolePage(page)

    test.skip(
      !features.includes('members'),
      'seeded plan does not grant members — cannot exercise the members flow'
    )

    // Invites are delivered by the inviter (no email is sent), so the
    // shareable artifacts ARE the feature: clipboard permissions let us
    // assert the copied artifact, not just its button.
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await workspace.open('/dashboard/members')

    const email = `invitee+${Date.now()}@donate.app`
    await page.getByPlaceholder('Invite by email...').fill(email)
    await page.getByRole('button', { name: 'Invite', exact: true }).click()

    // Fresh-invite callout: the code plus the copy action.
    const callout = page.getByRole('status')
    await expect(
      callout.getByText(`Invite created for ${email}.`)
    ).toBeVisible()
    const code = await callout.locator('code').innerText()
    expect(code).toMatch(/^[0-9a-f]{64}$/)

    await callout.getByRole('button', { name: 'Copy invite link' }).click()
    const link = await page.evaluate(() => navigator.clipboard.readText())
    expect(link).toBe(`${new URL(page.url()).origin}/invite?token=${code}`)

    // The pending row keeps the link reachable after the callout is gone.
    const row = page.locator('.divide-y > div').filter({ hasText: email })
    await expect(
      row.getByRole('button', { name: 'Copy invite link' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Copy invite link' })
    ).toHaveCount(2)

    await row.getByRole('button', { name: 'Revoke' }).click()
  })

  test('When settings feature active, /dashboard/settings shows the org form', async ({
    page,
  }) => {
    const workspace = new ConsolePage(page)

    test.skip(
      !features.includes('settings'),
      'seeded plan does not grant settings — cannot exercise the settings flow'
    )

    await workspace.open('/dashboard/settings')

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
    const workspace = new ConsolePage(page)

    test.skip(
      !features.includes('settings'),
      'seeded plan does not grant settings — cannot exercise the settings flow'
    )

    await workspace.open('/dashboard/settings')

    const nameInput = page.getByLabel('Organization Name')
    const original = await nameInput.inputValue()
    await nameInput.fill(`${original} Updated`)
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Saved!')).toBeVisible()

    await nameInput.fill(original)
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Saved!')).toBeVisible()
  })

  test('When owner opens /dashboard/billing, the current plan section renders', async ({
    page,
  }) => {
    const workspace = new ConsolePage(page)
    await workspace.open('/dashboard/billing')

    await expect(
      page.getByRole('heading', { name: 'Billing', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Current Plan' })
    ).toBeVisible()
  })
})
