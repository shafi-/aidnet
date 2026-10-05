import type { Page, Locator } from '@playwright/test'

export class OrgSelectPage {
  readonly page: Page
  private readonly cards: Locator

  constructor(page: Page) {
    this.page = page
    this.cards = page.getByRole('button').filter({ has: page.locator('h2') })
  }

  async open() {
    await this.page.goto('/orgs')
  }

  /** Select by exact org name; org selection UI renders cards as buttons. */
  async select(name: string) {
    await this.cards
      .filter({ has: this.page.getByRole('heading', { name }) })
      .first()
      .click()
  }
}

export class DashboardPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async open() {
    await this.page.goto('/dashboard')
  }

  tab(name: 'Todos' | 'Members' | 'Settings' | 'Billing'): Locator {
    return this.page.getByRole('button', { name, exact: true })
  }
}
