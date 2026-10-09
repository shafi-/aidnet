import { test, expect } from '@playwright/test'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }
const SLUG = 'demo-campaign-1'

// Reports accumulate across projects/runs by design (the ledger is the
// product), so every assertion is relative to the raised total read at the
// start — never a hard-coded number. The unique reference ties the two
// tests together and keeps stale pendings from crashed runs irrelevant.
let reference = ''

async function readRaisedAmount(page: import('@playwright/test').Page) {
  const text = await page
    .getByText(/BDT raised/)
    .first()
    .textContent()
  const match = text?.match(/([\d,]+) BDT raised/)
  expect(match, `raised line in "${text}"`).toBeTruthy()
  return Number((match![1] ?? '0').replace(/,/g, ''))
}

async function loginAsOwner(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(OWNER.email)
  await page.locator('#password').fill(OWNER.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test.describe.serial('Donation reports', () => {
  test('When a donor reports an out-of-band donation, it stays pending', async ({
    page,
  }) => {
    reference = `E2E-TRX-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    await page.goto(`/campaigns/detail?slug=${SLUG}`)
    const raisedBefore = await readRaisedAmount(page)

    await page.getByRole('button', { name: 'I donated' }).click()
    await page.getByLabel('Amount', { exact: true }).fill('750')
    await page.getByLabel('Method').selectOption('bkash')
    await page.getByLabel(/Reference \/ TrxID/).fill(reference)
    await page.getByLabel('Your name').fill('E2E Donor')
    await page.getByRole('button', { name: 'Send report' }).click()

    await expect(
      page.getByRole('heading', { name: 'Thank you!' })
    ).toBeVisible()

    // Pending reports never move the public total.
    await page.goto(`/campaigns/detail?slug=${SLUG}`)
    expect(await readRaisedAmount(page)).toBe(raisedBefore)
  })

  test('When the organization confirms a report, raised increases', async ({
    page,
  }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard/donations')

    // The cross-campaign ledger needs no campaign selection; scope to the
    // review queue and target THIS run's report by its unique reference —
    // stale pendings from crashed runs must not count.
    const queueSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Awaiting confirmation' }),
    })
    const pendingRow = queueSection
      .locator('li', { hasText: reference })
      .first()
    await expect(pendingRow).toBeVisible({ timeout: 15000 })

    await page.goto(`/campaigns/detail?slug=${SLUG}`)
    const raisedBefore = await readRaisedAmount(page)

    await page.goto('/dashboard/donations')
    const row = page
      .locator('section', {
        has: page.getByRole('heading', { name: 'Awaiting confirmation' }),
      })
      .locator('li', { hasText: reference })
      .first()
    await row.getByRole('button', { name: 'Confirm' }).click()

    // The report leaves the queue…
    await expect(
      queueSection.locator('li', { hasText: reference }).first()
    ).toHaveCount(0)

    // …lands in the confirmed ledger…
    const confirmedSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Confirmed', exact: true }),
    })
    await expect(confirmedSection.getByText(reference).first()).toBeVisible()

    // …and the public total moves only on confirmation.
    await page.goto(`/campaigns/detail?slug=${SLUG}`)
    expect(await readRaisedAmount(page)).toBe(raisedBefore + 750)
  })
})
