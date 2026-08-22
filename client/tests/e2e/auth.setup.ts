import { test as setup, expect } from '@playwright/test'
import { USERS } from './lib/api'

const STATE_DIR = 'tests/e2e/.auth'

for (const [role, creds] of Object.entries(USERS)) {
  setup(`authenticate ${role}`, async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', creds.email)
    await page.fill('input[type="password"]', creds.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      timeout: 15000,
    })

    if (selectOrgFor(role)) {
      await page.goto('/orgs')
      const card = page
        .getByRole('button')
        .filter({ has: page.getByRole('heading', { name: 'Demo Organization' }) })
        .first()
      await expect(card).toBeVisible()
      await card.click()
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem('supanext.currentOrgId')))
        .toBeTruthy()
    }

    await page.context().storageState({
      path: `${STATE_DIR}/${role}.json`,
    })
  })
}

function selectOrgFor(role: string): boolean {
  // Only org-scoped roles need an org preselected for dashboard tests.
  return role === 'orgOwner' || role === 'orgMember'
}
