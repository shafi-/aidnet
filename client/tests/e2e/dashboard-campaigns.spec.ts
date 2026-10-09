import { test, expect } from '@playwright/test'
import { SUPABASE_URL, rpc, signIn, USERS } from './lib/api'
import { gotoStable } from './lib/ui'

const OWNER_STATE = 'tests/e2e/.auth/orgOwner.json'

test.use({ storageState: OWNER_STATE })

/** Row-scoped Edit navigation: the list row shows the campaign slug as /slug.
 *  Negative lookahead keeps /demo-campaign-1 from matching /demo-campaign-10+. */
async function openEditForSlug(
  page: import('@playwright/test').Page,
  slug: string
) {
  await gotoStable(page, '/dashboard/campaigns')
  const row = page
    .locator('.divide-y > div')
    .filter({ hasText: new RegExp(`/${slug}(?!\\d)`) })
  await row.getByRole('link', { name: 'Edit' }).click()
  await expect(page).toHaveURL(/\/dashboard\/campaigns\/edit/)
}

function tagChip(page: import('@playwright/test').Page, label: string) {
  return page.getByRole('button', { name: label, exact: true })
}

test.describe('Dashboard Campaigns', () => {
  test('When owner loads /dashboard/campaigns, list and New Campaign link show', async ({
    page,
  }) => {
    await gotoStable(page, '/dashboard/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaigns' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New Campaign' })).toBeVisible()
  })

  test('When owner clicks New Campaign, navigates to campaign form', async ({
    page,
  }) => {
    await gotoStable(page, '/dashboard/campaigns')
    await page.getByRole('link', { name: 'New Campaign' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/new/)
    await expect(
      page.getByRole('heading', { name: 'New Campaign' })
    ).toBeVisible()
  })

  test('When owner opens campaign form, all fields are present', async ({
    page,
  }) => {
    await gotoStable(page, '/dashboard/campaigns/new')
    await expect(
      page.getByRole('textbox', { name: 'Title', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: /Campaign link/ })
    ).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByLabel('Cover image link')).toBeVisible()
    await expect(page.getByLabel('Goal amount')).toBeVisible()
    await expect(page.getByLabel('Currency')).toBeVisible()
    await expect(page.getByLabel('Start Date')).toBeVisible()
    await expect(page.getByLabel('End Date')).toBeVisible()
    await expect(
      page.getByText('Zakat eligible', { exact: true })
    ).toBeVisible()
  })

  test('When owner submits campaign form, returns to campaigns list', async ({
    page,
  }) => {
    await gotoStable(page, '/dashboard/campaigns/new')
    await page
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(`E2E Campaign ${Date.now()}`)
    await page.getByRole('button', { name: 'Create Campaign' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)
  })

  test('When owner clicks Cancel on form, returns to campaigns list', async ({
    page,
  }) => {
    await gotoStable(page, '/dashboard/campaigns/new')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)
  })

  test('When campaigns exist, each shows an Edit link', async ({ page }) => {
    await gotoStable(page, '/dashboard/campaigns')
    const editLinks = page.locator('a[href*="/dashboard/campaigns/edit"]')
    await expect(editLinks.first()).toBeVisible()
  })

  test('When owner clicks Edit, navigates to edit form', async ({ page }) => {
    await gotoStable(page, '/dashboard/campaigns')
    const editLink = page
      .locator('a[href*="/dashboard/campaigns/edit"]')
      .first()
    await editLink.click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/edit/)
    await expect(
      page.getByRole('heading', { name: 'Edit Campaign' })
    ).toBeVisible()
  })

  test('When owner opens edit form, fields are pre-filled with Save Changes', async ({
    page,
  }) => {
    await gotoStable(page, '/dashboard/campaigns')
    const editLink = page
      .locator('a[href*="/dashboard/campaigns/edit"]')
      .first()
    await editLink.click()
    const titleInput = page.getByRole('textbox', {
      name: 'Title',
      exact: true,
    })
    await expect(titleInput).not.toHaveValue('')
    await expect(
      page.getByRole('button', { name: 'Save Changes' })
    ).toBeVisible()
  })

  test('When draft campaigns exist, Submit for Review is shown', async ({
    page,
  }) => {
    await gotoStable(page, '/dashboard/campaigns')
    const submitBtn = page.getByRole('button', { name: 'Submit for Review' })
    await expect(submitBtn.first()).toBeVisible()
  })

  test('When owner toggles Zakat eligible, checkbox becomes checked', async ({
    page,
  }) => {
    await gotoStable(page, '/dashboard/campaigns/new')
    const zakatRow = page.getByText('Zakat eligible', { exact: true })
    const checkbox = zakatRow.locator('..').locator('input[type="checkbox"]')
    await expect(checkbox).toBeVisible()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
  })

  // Regression guard for the tag-wipe bug: set_campaign_tags is destructive
  // (delete-all-then-insert), so an edit-save that never touched tags must
  // still send the loaded current selection — not an empty one.
  test('When owner saves a tagged campaign without touching tags, tags persist after reopen', async ({
    page,
  }) => {
    await openEditForSlug(page, 'demo-draft-tagged')
    await expect(tagChip(page, 'Education')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(tagChip(page, 'Health')).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)

    await openEditForSlug(page, 'demo-draft-tagged')
    await expect(tagChip(page, 'Education')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(tagChip(page, 'Health')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  test('When owner changes tag selection and saves, the new selection persists and matches the database', async ({
    page,
    request,
  }) => {
    test.skip(!SUPABASE_URL, 'requires Supabase env for API-contract check')

    await openEditForSlug(page, 'demo-draft-tagged')
    await tagChip(page, 'Education').click() // deselect
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)

    // UI outcome: reload shows Health only
    await openEditForSlug(page, 'demo-draft-tagged')
    await expect(tagChip(page, 'Health')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(tagChip(page, 'Education')).toHaveAttribute(
      'aria-pressed',
      'false'
    )

    // API contract: server rows match exactly what the UI shows
    const session = await signIn(
      request,
      USERS.orgOwner.email,
      USERS.orgOwner.password
    )
    const orgs = await rpc<Array<{ id: string; slug: string }>>(
      request,
      session,
      'get_my_organizations'
    )
    const demoOrg = orgs.find(o => o.slug === 'demo-org')
    expect(demoOrg, 'seeded demo-org').toBeTruthy()
    const campaigns = await rpc<Array<{ id: string; slug: string }>>(
      request,
      session,
      'get_campaigns',
      { p_org_id: demoOrg!.id }
    )
    const campaign = campaigns.find(c => c.slug === 'demo-draft-tagged')
    expect(campaign, 'seeded demo-campaign-1').toBeTruthy()
    const allTags = await rpc<Array<{ id: string; slug: string }>>(
      request,
      session,
      'get_campaign_tags'
    )
    const expectedIds = allTags
      .filter(t => t.slug === 'health')
      .map(t => t.id)
      .sort()
    const storedIds = (
      await rpc<string[]>(request, session, 'get_campaign_tag_ids', {
        p_campaign_id: campaign!.id,
      })
    )
      .slice()
      .sort()

    expect(storedIds).toEqual(expectedIds)

    // Restore the seeded fixture (Education + Health): this test saved a
    // modified selection, and every later browser project re-runs this file
    // against the same database — without the restore, their 142 sees the
    // mutated tags and fails.
    await openEditForSlug(page, 'demo-draft-tagged')
    await tagChip(page, 'Education').click() // re-select
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)
    await openEditForSlug(page, 'demo-draft-tagged')
    await expect(tagChip(page, 'Education')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  test('When owner creates a campaign with a tag selected, the tag persists on the created campaign', async ({
    page,
  }) => {
    const title = `Tagged E2E ${Date.now()}`
    const expectedSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    await gotoStable(page, '/dashboard/campaigns/new')
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title)
    await tagChip(page, 'Education').click()
    await expect(tagChip(page, 'Education')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await page.getByRole('button', { name: 'Create Campaign' }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)

    await openEditForSlug(page, expectedSlug)
    await expect(tagChip(page, 'Education')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})
