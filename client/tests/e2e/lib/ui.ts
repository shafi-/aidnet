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
  // Idempotent: the drawer covers the hamburger once open, so a second
  // click would stall on actionability (aria-hidden aside drops out of the
  // a11y tree when closed, so role=dialog only matches while open).
  if (await page.getByRole('dialog', { name: 'Open menu' }).isVisible()) return
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible()
}

/**
 * Let the post-login hydration settle before a hard page.goto(): the login
 * redirect lands as a soft navigation while providers (auth, org, i18n) are
 * still booting, and a goto racing that work aborts in Firefox
 * (NS_BINDING_ABORTED). Same idea as navigation.spec's waitStable.
 */
export async function settleAfterLogin(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}

/**
 * Hard navigation that survives a goto racing the previous document's own
 * navigation: Firefox aborts with NS_BINDING_ABORTED, WebKit reports the
 * goto "interrupted by another navigation" when the post-login soft
 * navigation to /dashboard commits late. Either way the retry wins once
 * the stale navigation settles. Use for goto-after-login flows.
 */
export async function gotoStable(
  page: Page,
  url: string,
  attempts = 3
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(url)
      return
    } catch (error) {
      const message = String(error)
      const racing =
        message.includes('NS_BINDING_ABORTED') ||
        message.includes('interrupted by another navigation')
      if (attempt >= attempts || !racing) throw error
    }
  }
}

/**
 * Sign in through the login form. Fills only after the initial JS work
 * settles: the form inputs are controlled, so a fill that lands before
 * hydration is wiped when React attaches (WebKit is the slowest engine —
 * same race org-metadata.spec documents for the request form).
 */
export async function loginViaUi(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/auth/login/')
  await page.waitForLoadState('networkidle')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
}

/**
 * Console-section locators: the sidebar link on desktop, the same link
 * inside the drawer below the md breakpoint.
 */
function consoleSectionLocators(page: Page, navName: string, name: string) {
  return {
    sidebarLink: page
      .getByRole('navigation', { name: navName })
      .getByRole('link', { name }),
    drawerLink: page
      .getByRole('dialog', { name: 'Open menu' })
      .getByRole('link', { name }),
  }
}

/**
 * Assert a console section is reachable: sidebar on desktop, drawer on
 * mobile. Branching follows the md breakpoint (same contract as
 * openNavMenu/openAccountMenu) — on mobile the drawer content does not
 * exist until opened, so DOM sampling cannot pick the branch.
 */
export async function expectConsoleSection(
  page: Page,
  navName: string,
  name: string
): Promise<void> {
  const { sidebarLink, drawerLink } = consoleSectionLocators(
    page,
    navName,
    name
  )
  if (!isMobileViewport(page)) {
    await expect(sidebarLink).toBeVisible()
    return
  }
  await openNavMenu(page)
  await expect(drawerLink).toBeVisible()
}

/**
 * Navigate to a console section: the sidebar link on desktop, the same
 * link inside the drawer below the md breakpoint. Branching follows the
 * md breakpoint (same contract as openNavMenu/openAccountMenu) — on
 * mobile the drawer content does not exist until opened, so DOM sampling
 * cannot pick the branch.
 */
export async function openConsoleSection(
  page: Page,
  navName: string,
  name: string
): Promise<void> {
  const { sidebarLink, drawerLink } = consoleSectionLocators(
    page,
    navName,
    name
  )
  if (!isMobileViewport(page)) {
    await sidebarLink.click()
    return
  }
  await openNavMenu(page)
  await drawerLink.click()
}

/**
 * Navigate to an admin console section from any admin page — no
 * back-links or dropdowns involved.
 */
export async function openAdminSection(
  page: Page,
  name: string
): Promise<void> {
  await openConsoleSection(page, 'Admin navigation', name)
}

/**
 * Account controls (Profile / Sign out) live in the account dropdown on
 * desktop and flat inside the drawer on mobile. Same contract as
 * openNavMenu: call openNavMenu first for mobile flows.
 */
export async function openAccountMenu(page: Page): Promise<void> {
  if (isMobileViewport(page)) return
  await page.getByRole('button', { name: 'Account menu' }).click()
  // Desktop dropdown items are Radix menuitems (the drawer renders links,
  // but this helper is a no-op on mobile).
  await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeVisible()
}
