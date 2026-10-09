import type { Page, Locator } from '@playwright/test'
import { orgReady } from '../lib/ui'

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
    // Wait for the OrganizationProvider bootstrap to settle before any
    // tab interaction — clicking mid-bootstrap races a transient second
    // render and fails strict mode with two tab bars.
    await orgReady(this.page)
  }

  tab(name: 'Members' | 'Settings' | 'Billing'): Locator {
    // The dashboard can briefly mount a second tab bar during provider
    // bootstrap; both render identical buttons, so pin to the first.
    return this.page.getByRole('button', { name, exact: true }).first()
  }
}
