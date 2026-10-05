import { test, expect } from '@playwright/test'
import { approveUser, latestMagicLink } from './support/local-supabase'

test('new user is held at the approval gate until approved', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`

  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send magic link' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()

  await page.goto(await latestMagicLink(email))
  await expect(page.getByRole('heading', { name: 'Waiting for approval' })).toBeVisible()

  await approveUser(email)
  // The pending screen polls, so no reload is needed.
  await expect(page.getByRole('heading', { name: /^Welcome,/ })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible()
})
