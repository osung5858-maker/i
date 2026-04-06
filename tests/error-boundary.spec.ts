import { test, expect } from './fixtures/auth.fixture'

/**
 * Error Boundary E2E Tests
 *
 * Verify pages render normally without triggering error boundaries.
 * Note: React error boundaries can't be reliably triggered from Playwright
 * because client-side fetch errors are caught by try/catch in the app code.
 * Instead we verify pages load without showing error UI.
 */
test.describe('Error Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      localStorage.setItem('dodam_child_name', 'Test Baby')
      localStorage.setItem(
        'dodam_child_birthdate',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      )
    })
  })

  test('settings page renders without error boundary', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('community page renders without error boundary', async ({ page }) => {
    await page.goto('/community')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('record page renders without error boundary', async ({ page }) => {
    await page.goto('/record')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('town page renders without error boundary', async ({ page }) => {
    await page.goto('/town')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('pregnant page renders without error boundary', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'pregnant')
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 200)
      localStorage.setItem('dodam_preg_duedate', dueDate.toISOString().split('T')[0])
    })
    await page.goto('/pregnant')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('body')).toBeVisible()
  })
})
