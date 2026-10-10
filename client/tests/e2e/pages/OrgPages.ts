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
    await this.page.goto('/manage/orgs')
  }

  /** Select by exact org name; org selection UI renders cards as buttons. */
  async select(name: string) {
    await this.cards
      .filter({ has: this.page.getByRole('heading', { name }) })
      .first()
      .click()
  }
}

/**
 * Workspace console pages: open a route and wait out the
 * OrganizationProvider bootstrap before interacting — clicking
 * mid-bootstrap races a transient second render.
 */
export class ConsolePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async open(path = '/dashboard') {
    await this.page.goto(path)
    await orgReady(this.page)
  }
}

export type { Page }
