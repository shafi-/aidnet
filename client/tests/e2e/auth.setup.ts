import { test as setup, expect } from '@playwright/test'
import { USERS } from './lib/api'
import { loginViaUi } from './lib/ui'

const STATE_DIR = 'tests/e2e/.auth'

for (const [role, creds] of Object.entries(USERS)) {
  setup(`authenticate ${role}`, async ({ page }) => {
    await loginViaUi(page, creds.email, creds.password)

    if (selectOrgFor(role)) {
      await page.goto('/orgs')
      // Fresh context has no currentOrgId. Single-org accounts are
      // auto-selected by the OrganizationProvider (the select-screen is
      // skipped), so the org card may not be visible. Multi-org accounts
      // see the select-screen with orgs rendered as buttons.
      const card = page
        .getByRole('button')
        .filter({
          has: page.getByRole('heading', { name: 'Demo Organization' }),
        })
        .first()
      try {
        await expect(card).toBeVisible({ timeout: 5000 })
        await card.click()
      } catch {
        // Auto-selected: nothing to click.
      }
      await expect
        .poll(() =>
          page.evaluate(() => localStorage.getItem('supanext.currentOrgId'))
        )
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
