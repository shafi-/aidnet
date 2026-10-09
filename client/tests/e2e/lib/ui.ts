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

export function isMobileViewport(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 768
}

/**
 * Auth/nav controls live in the top nav on desktop (>=768px) and in the
 * app-style drawer below that, where the desktop controls are display:none.
 * Opens the drawer first on mobile so role-based locators resolve to the one
 * visible control instead of timing out on a hidden element. No-op on desktop.
 */
export async function openNavMenu(page: Page): Promise<void> {
  if (!isMobileViewport(page)) return
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible()
}

/**
 * System-admin links live in the Admin dropdown on desktop and flat inside
 * the drawer's System section on mobile. Opens the desktop dropdown; no-op
 * on mobile where openNavMenu already surfaces the links. Call openNavMenu
 * first on flows that must work in both viewports.
 */
export async function openSystemMenu(page: Page): Promise<void> {
  if (isMobileViewport(page)) return
  await page.getByRole('button', { name: 'Admin menu' }).click()
  // Desktop dropdown items are Radix menuitems (the drawer renders links,
  // but this helper is a no-op on mobile).
  await expect(
    page.getByRole('menuitem', { name: 'Admin overview' })
  ).toBeVisible()
}

/**
 * Account controls (Profile / Sign out) live in the account dropdown on
 * desktop and flat inside the drawer on mobile. Same contract as
 * openSystemMenu: call openNavMenu first for mobile flows.
 */
export async function openAccountMenu(page: Page): Promise<void> {
  if (isMobileViewport(page)) return
  await page.getByRole('button', { name: 'Account menu' }).click()
  // Desktop dropdown items are Radix menuitems (the drawer renders links,
  // but this helper is a no-op on mobile).
  await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeVisible()
}
