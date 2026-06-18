import { test, expect } from '@playwright/test'

test.describe('Quote flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@pctechnz.co.nz')
    await page.fill('[name="password"]', 'changeme123')
    await page.click('[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('staff can create a quote and it appears on the dashboard', async ({ page }) => {
    await page.click('text=New Quote')
    await page.waitForURL(/\/quotes\//)

    // Fill in title
    const titleInput = page.locator('#title')
    await titleInput.clear()
    await titleInput.fill('E2E Test Quote')

    // Add a one-off line item
    await page.click('text=+ Add Row', { force: true })
    const descInput = page.locator('input[placeholder="Description"]').first()
    await descInput.fill('Test Item')

    // Save draft
    await page.click('text=Save Draft')
    await expect(page.locator('text=Saved')).toBeVisible()

    // Navigate to dashboard and verify
    await page.goto('/dashboard')
    await expect(page.locator('text=E2E Test Quote')).toBeVisible()
  })

  test('client proposal page shows accept and decline buttons', async ({ page, browser }) => {
    // Create and send a quote first
    await page.click('text=New Quote')
    await page.waitForURL(/\/quotes\//)

    const titleInput = page.locator('#title')
    await titleInput.clear()
    await titleInput.fill('Client Test Quote')
    await page.click('text=Save Draft')
    await page.waitForSelector('text=Saved')

    await page.click('text=Send to Client')
    await page.waitForSelector('text=Sent')

    // Get the proposal link
    await page.click('text=Copy proposal link')
    const url = await page.evaluate(() => navigator.clipboard.readText())

    // Open proposal in a new context (unauthenticated)
    const clientContext = await browser.newContext()
    const clientPage = await clientContext.newPage()
    await clientPage.goto(url)

    await expect(clientPage.locator('text=Accept Quote')).toBeVisible()
    await expect(clientPage.locator('text=Decline Quote')).toBeVisible()

    // Accept the quote
    await clientPage.click('text=Accept Quote')
    await expect(clientPage.locator('text=Quote Accepted')).toBeVisible()

    await clientContext.close()

    // Staff dashboard should show ACCEPTED
    await page.goto('/dashboard')
    await expect(page.locator('text=ACCEPTED')).toBeVisible()
  })
})
