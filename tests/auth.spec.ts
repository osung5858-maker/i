import { test, expect } from '@playwright/test'

/**
 * Authentication Flow Tests
 *
 * The onboarding page has two states:
 * 1. Unauthenticated → login screen (Kakao + Google buttons)
 * 2. Authenticated   → mode selection cards (preparing / pregnant / parenting)
 *
 * Without real Supabase credentials, only the login screen renders.
 * Mode-selection tests are skipped gracefully when auth is unavailable.
 */

/** Wait for the onboarding page to finish its auth check (shimmer spinner). */
async function waitForAuthCheck(page: import('@playwright/test').Page) {
  await page.goto('/onboarding')
  await page.waitForLoadState('domcontentloaded')
  // The page shows a shimmer spinner while checking auth.
  // Wait for it to disappear (login screen or mode selection renders).
  await page.waitForSelector('.shimmer', { state: 'hidden', timeout: 15000 }).catch(() => {})
  // Extra settle time for hydration
  await page.waitForTimeout(500)
}

/** Check if the mode selection screen is visible (user is authenticated). */
async function isModeSelectionVisible(page: import('@playwright/test').Page): Promise<boolean> {
  // Mode selection shows buttons with text like "임신 준비 중", "임신 중", "육아 중"
  const modeButton = page.getByRole('button', { name: /임신 준비 중|임신 중|육아 중/ }).first()
  return await modeButton.isVisible({ timeout: 2000 }).catch(() => false)
}

test.describe('Authentication - Login Screen', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should display onboarding login screen for unauthenticated users', async ({ page }) => {
    await waitForAuthCheck(page)

    // The login screen should show the branding title "도담"
    await expect(page.locator('h1').first()).toBeVisible()

    // Should have at least two login buttons (Kakao + Google)
    const buttons = page.getByRole('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should show Kakao and Google login buttons', async ({ page }) => {
    await waitForAuthCheck(page)

    // Check if we ended up on the login screen (not mode selection)
    const hasModeSelection = await isModeSelectionVisible(page)
    if (hasModeSelection) {
      // User is authenticated — login buttons won't show
      test.skip(true, 'User is authenticated — login buttons not shown')
      return
    }

    // Kakao button
    const kakaoButton = page.getByRole('button', { name: /카카오로 시작하기/ })
    await expect(kakaoButton).toBeVisible()

    // Google button
    const googleButton = page.getByRole('button', { name: /Google로 시작하기/ })
    await expect(googleButton).toBeVisible()
  })

  test('should show terms and privacy links', async ({ page }) => {
    await waitForAuthCheck(page)

    const hasModeSelection = await isModeSelectionVisible(page)
    if (hasModeSelection) {
      test.skip(true, 'User is authenticated — login screen not shown')
      return
    }

    // Terms and privacy links at the bottom
    await expect(page.getByRole('link', { name: /서비스 이용약관/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /개인정보처리방침/ })).toBeVisible()
  })
})

test.describe('Authentication - Mode Selection', () => {
  test('should show mode selection when authenticated', async ({ page }) => {
    await waitForAuthCheck(page)

    const hasModeSelection = await isModeSelectionVisible(page)
    if (!hasModeSelection) {
      test.skip(true, 'Auth not available — mode selection not shown')
      return
    }

    // All three mode buttons should be visible
    await expect(page.getByRole('button', { name: /임신 준비 중/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /임신 중/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /육아 중/ })).toBeVisible()
  })

  test('should navigate to home after selecting parenting mode', async ({ page }) => {
    await waitForAuthCheck(page)

    const parentingButton = page.getByRole('button', { name: /육아 중/ })
    const isVisible = await parentingButton.isVisible({ timeout: 2000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Auth not available — mode selection not shown')
      return
    }

    await parentingButton.click()
    await page.waitForURL('/', { timeout: 10000 })

    const mode = await page.evaluate(() => localStorage.getItem('dodam_mode'))
    expect(mode).toBe('parenting')
  })

  test('should navigate to pregnant page after selecting pregnant mode', async ({ page }) => {
    await waitForAuthCheck(page)

    const pregnantButton = page.getByRole('button', { name: /임신 중/ })
    const isVisible = await pregnantButton.isVisible({ timeout: 2000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Auth not available — mode selection not shown')
      return
    }

    await pregnantButton.click()
    await page.waitForURL('/pregnant', { timeout: 10000 })

    const mode = await page.evaluate(() => localStorage.getItem('dodam_mode'))
    expect(mode).toBe('pregnant')
  })

  test('should navigate to preparing page after selecting preparing mode', async ({ page }) => {
    await waitForAuthCheck(page)

    const preparingButton = page.getByRole('button', { name: /임신 준비 중/ })
    const isVisible = await preparingButton.isVisible({ timeout: 2000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Auth not available — mode selection not shown')
      return
    }

    await preparingButton.click()
    await page.waitForURL('/preparing', { timeout: 10000 })

    const mode = await page.evaluate(() => localStorage.getItem('dodam_mode'))
    expect(mode).toBe('preparing')
  })

  test('should persist mode selection in localStorage', async ({ page }) => {
    await waitForAuthCheck(page)

    const parentingButton = page.getByRole('button', { name: /육아 중/ })
    const isVisible = await parentingButton.isVisible({ timeout: 2000 }).catch(() => false)
    if (!isVisible) {
      test.skip(true, 'Auth not available — mode selection not shown')
      return
    }

    await parentingButton.click()
    await page.waitForURL('/', { timeout: 10000 })

    const mode = await page.evaluate(() => localStorage.getItem('dodam_mode'))
    expect(mode).toBe('parenting')
  })
})
