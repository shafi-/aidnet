import type { Page } from '@playwright/test'

export class AdminPlansPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async open(): Promise<'allowed' | 'denied'> {
    await this.page.goto('/admin/plans')
    const allowed = this.page
      .locator('h1')
      .filter({ hasText: 'Subscription Plans' })
    try {
      await allowed.waitFor({ timeout: 15000 })
      return 'allowed'
    } catch {
      return 'denied'
    }
  }
}
