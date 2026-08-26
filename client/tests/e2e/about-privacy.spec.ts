import { test, expect } from '@playwright/test'

test.describe('About Page', () => {
  test('When anon loads /about, heading and feature list render', async ({
    page,
  }) => {
    await page.goto('/about/')
    await expect(
      page.getByRole('heading', { name: 'About SupaNext' })
    ).toBeVisible()
    await expect(
      page.getByText('A NextJS + Supabase starter template')
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible()
    await expect(page.getByText('RLS-based authorization')).toBeVisible()
    await expect(
      page.getByText('Multi-tenant organization management')
    ).toBeVisible()
    await expect(page.getByText('Role-based access control')).toBeVisible()
    await expect(
      page.getByText('Function-first database operations')
    ).toBeVisible()
    await expect(page.getByText('Static export compatible')).toBeVisible()
  })
})

test.describe('Privacy Page', () => {
  test('When anon loads /privacy, policy sections render', async ({ page }) => {
    await page.goto('/privacy/')
    await expect(
      page.getByRole('heading', { name: 'Privacy Policy' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Data Collection' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Data Usage' })
    ).toBeVisible()
  })
})
