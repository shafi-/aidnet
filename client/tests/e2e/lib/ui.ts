import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Wait until the OrganizationProvider finished its async bootstrap
 * (session restore -> org list fetch -> selection decision). Static-export
 * SPA: every page.goto() remounts everything, so assertions that care about
 * org state must run AFTER this resolves. The provider exposes readiness via
 * a data attribute on <html>.
 */
export async function orgReady(page: Page, timeout = 15000): Promise<void> {
  await expect
    .poll(
      () => page.evaluate(() => document.documentElement.dataset.orgReady),
      { timeout }
    )
    .toBe('true')
}
