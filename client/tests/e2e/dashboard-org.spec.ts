import { test, expect } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'test@example.com'
const password = process.env.E2E_PASSWORD ?? 'Password123!'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 })
}

async function selectOrg(page: import('@playwright/test').Page) {
  await page.goto('/orgs')
  const hasOrg = await page.waitForFunction(() => {
    return localStorage.getItem('supanext.currentOrgId') !== null
  }, { timeout: 10000 }).then(() => true).catch(() => false)
  if (!hasOrg) {
    await page.locator('a[href*="/orgs?id="]').first().click()
    await page.waitForFunction(() => {
      return localStorage.getItem('supanext.currentOrgId') !== null
    }, { timeout: 10000 })
  }
}

async function goToDashboardWithOrg(page: import('@playwright/test').Page) {
  await login(page)
  await selectOrg(page)
  await page.goto('/dashboard')
}

test.describe('OrgDashboard', () => {
  test('shows org name and billing tab', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await goToDashboardWithOrg(page)

    // OrgDashboard renders org name as h1
    await expect(page.locator('.bg-white.rounded-lg.shadow h1').first()).toBeVisible()
    // Billing tab is always visible for owners
    await expect(page.getByRole('button', { name: 'Billing' })).toBeVisible()
  })

  test('todos tab shows add form when feature enabled', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await goToDashboardWithOrg(page)

    const todosBtn = page.getByRole('button', { name: 'Todos' })
    if ((await todosBtn.count()) === 0) {
      test.skip()
      return
    }
    await todosBtn.click()
    await expect(page.getByPlaceholder('New todo...')).toBeVisible()

    const todoTitle = `E2E Todo ${Date.now()}`
    await page.getByPlaceholder('New todo...').fill(todoTitle)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText(todoTitle)).toBeVisible()
  })

  test('todos tab can toggle completion', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await goToDashboardWithOrg(page)

    const todosBtn = page.getByRole('button', { name: 'Todos' })
    if ((await todosBtn.count()) === 0) {
      test.skip()
      return
    }
    await todosBtn.click()

    const todoTitle = `E2E Toggle ${Date.now()}`
    await page.getByPlaceholder('New todo...').fill(todoTitle)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText(todoTitle)).toBeVisible()

    const todoItem = page.locator('li').filter({ hasText: todoTitle })
    const checkbox = todoItem.locator('input[type="checkbox"]')
    await checkbox.click()
    await expect(checkbox).toBeChecked()
  })

  test('todos tab can delete a todo', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await goToDashboardWithOrg(page)

    const todosBtn = page.getByRole('button', { name: 'Todos' })
    if ((await todosBtn.count()) === 0) {
      test.skip()
      return
    }
    await todosBtn.click()

    const todoTitle = `E2E Delete ${Date.now()}`
    await page.getByPlaceholder('New todo...').fill(todoTitle)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText(todoTitle)).toBeVisible()

    const todoItem = page.locator('li').filter({ hasText: todoTitle })
    await todoItem.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(todoTitle)).not.toBeVisible()
  })

  test('members tab shows member list when feature enabled', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await goToDashboardWithOrg(page)

    const membersBtn = page.getByRole('button', { name: 'Members' })
    if ((await membersBtn.count()) === 0) {
      test.skip()
      return
    }
    await membersBtn.click()
    await expect(page.locator('ul')).toBeVisible()
  })

  test('members tab shows add member form for admin', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await goToDashboardWithOrg(page)

    const membersBtn = page.getByRole('button', { name: 'Members' })
    if ((await membersBtn.count()) === 0) {
      test.skip()
      return
    }
    await membersBtn.click()
    await expect(page.getByPlaceholder('Add member by email...')).toBeVisible()
  })

  test('settings tab shows org form for admin when feature enabled', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await goToDashboardWithOrg(page)

    const settingsBtn = page.getByRole('button', { name: 'Settings' })
    if ((await settingsBtn.count()) === 0) {
      test.skip()
      return
    }
    await settingsBtn.click()
    await expect(page.getByLabel('Organization Name')).toBeVisible()
    await expect(page.getByLabel('Slug')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
  })

  test('settings tab can save org changes', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')
    await goToDashboardWithOrg(page)

    const settingsBtn = page.getByRole('button', { name: 'Settings' })
    if ((await settingsBtn.count()) === 0) {
      test.skip()
      return
    }
    await settingsBtn.click()

    const nameInput = page.getByLabel('Organization Name')
    const originalName = await nameInput.inputValue()
    await nameInput.fill(`${originalName} Updated`)
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Saved!')).toBeVisible()

    // Restore original name
    await nameInput.fill(originalName)
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Saved!')).toBeVisible()
  })
})
