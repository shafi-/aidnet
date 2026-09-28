import { test, expect } from '@playwright/test'

const OWNER_STATE = 'tests/e2e/.auth/orgOwner.json'

test.describe('Campaign Detail Page - error states', () => {
  test('When unknown slug opened, Campaign Not Available is shown', async ({
    page,
  }) => {
    await page.goto('/campaigns/detail?slug=nonexistent')
    await expect(
      page.getByRole('heading', { name: 'Campaign Not Available' })
    ).toBeVisible()
  })

  test('When slug missing, missing-slug error is shown', async ({ page }) => {
    await page.goto('/campaigns/detail')
    await expect(
      page.getByRole('heading', { name: 'Campaign Not Available' })
    ).toBeVisible()
    await expect(page.getByText('Missing campaign slug')).toBeVisible()
  })

  test('When user clicks back link, navigates to campaigns list', async ({
    page,
  }) => {
    await page.goto('/campaigns/detail?slug=anything')
    await page.getByRole('link', { name: '← Back to campaigns' }).click()
    await expect(page).toHaveURL(/\/campaigns/)
  })
})

test.describe.serial('Campaign lifecycle - public visibility rules', () => {
  test.use({ storageState: OWNER_STATE })

  let slug = ''

  test('When owner creates and submits a campaign, it enters pending review', async ({
    page,
  }) => {
    await page.goto('/dashboard/campaigns')
    await page.getByRole('link', { name: 'New Campaign' }).click()

    const title = `E2E Detail Campaign ${Date.now()}`
    await page.getByLabel('Title', { exact: true }).fill(title)
    await page
      .getByLabel('Description', { exact: true })
      .fill('E2E campaign for detail-page behaviour')
    const goal = page.getByLabel(/Goal Amount/)
    if ((await goal.count()) > 0) await goal.fill('100000')
    await page.getByText('Zakat eligible', { exact: true }).click()
    await page.getByRole('button', { name: /Create/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)

    // Move to a known domain state: pending review
    await page
      .getByRole('button', { name: 'Submit for Review' })
      .first()
      .click()
    await expect(page.getByText(/pending/).first()).toBeVisible()

    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  })

  test('When unpublished campaign slug opened publicly, page is unavailable', async ({
    page,
  }) => {
    test.skip(
      !slug,
      'Owner lifecycle step did not produce a campaign to assert visibility on'
    )
    await page.goto(`/campaigns/detail?slug=${slug}`)
    await expect(
      page.getByRole('heading', { name: 'Campaign Not Available' })
    ).toBeVisible()
  })
})
