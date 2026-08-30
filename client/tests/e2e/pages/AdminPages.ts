import type { Page } from '@playwright/test'

export class AdminPlansPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async open(): Promise<'allowed' | 'denied'> {
    await this.page.goto('/admin/plans')
    // Wait for whichever heading actually renders — denial is the expected
    // path for non-admins, so we must not block on "Subscription Plans"
    // (it never appears for a denied user).
    await this.page
      .getByRole('heading', { name: /Subscription Plans|Access Denied/ })
      .waitFor()
    const isAllowed = await this.page
      .getByRole('heading', { name: 'Subscription Plans' })
      .isVisible()
    return isAllowed ? 'allowed' : 'denied'
  }
}
