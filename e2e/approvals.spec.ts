import { test, expect, type Page } from '@playwright/test'
import { latestMagicLink, makeSiteAdmin } from './support/local-supabase'

async function signIn(page: Page, email: string) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send magic link' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await page.goto(await latestMagicLink(email))
}

test('a site admin approves a waiting user from the approvals screen', async ({ browser }) => {
  const stamp = Date.now()
  const adminEmail = `e2e-admin-${stamp}@example.com`
  const newbieEmail = `e2e-newbie-${stamp}@example.com`

  const adminPage = await (await browser.newContext()).newPage()
  await signIn(adminPage, adminEmail)
  await expect(adminPage.getByRole('heading', { name: 'Waiting for approval' })).toBeVisible()
  await makeSiteAdmin(adminEmail)
  await expect(adminPage.getByText('You are a site admin.')).toBeVisible({ timeout: 15_000 })

  const newbiePage = await (await browser.newContext()).newPage()
  await signIn(newbiePage, newbieEmail)
  await expect(newbiePage.getByRole('heading', { name: 'Waiting for approval' })).toBeVisible()

  await adminPage.getByRole('button', { name: 'Approvals' }).click()
  const row = adminPage.getByRole('row', { name: new RegExp(newbieEmail) })
  await row.getByRole('button', { name: 'Approve' }).click()
  await expect(row).toBeHidden() // moved out of the pending tab

  // The waiting user's pending screen polls and lets them in without a reload.
  await expect(newbiePage.getByRole('heading', { name: /^Welcome,/ })).toBeVisible({
    timeout: 15_000,
  })
})
