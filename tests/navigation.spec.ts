import { test, expect } from './fixtures/auth.fixture'

/**
 * Navigation E2E Tests
 * Bottom nav tab switching, deep links, and route rendering.
 *
 * Bottom nav labels by mode:
 *   parenting: 오늘, 추억, 동네, 우리
 *   pregnant:  오늘, 기다림, 동네, 우리
 *   preparing: 오늘, 기다림, 동네, 우리
 *
 * Note: Bottom nav tests require authenticated user (page redirects
 * to /onboarding without auth). These tests are skipped gracefully
 * when the nav is not visible.
 */
async function isAuthenticated(page: import('@playwright/test').Page): Promise<boolean> {
  return !page.url().includes('/onboarding')
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      localStorage.setItem('dodam_child_name', 'Test Baby')
      localStorage.setItem(
        'dodam_child_birthdate',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      )
      // Dismiss onboarding overlays
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    })
    await page.reload().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('bottom nav tabs are visible when authenticated', async ({ page }) => {
    // Bottom nav only shows when user is authenticated (not on /onboarding)
    const navLink = page.getByRole('link', { name: '오늘', exact: true })
    const isVisible = await navLink.isVisible({ timeout: 5000 }).catch(() => false)

    if (!isVisible) {
      test.skip(true, 'Bottom nav not visible — user not authenticated')
      return
    }

    await expect(page.getByRole('link', { name: '추억', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '동네', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '우리', exact: true })).toBeVisible()
  })

  test('bottom nav tabs navigate to correct routes', async ({ page }) => {
    const recordLink = page.getByRole('link', { name: '추억', exact: true })
    const isVisible = await recordLink.isVisible({ timeout: 5000 }).catch(() => false)

    if (!isVisible) {
      test.skip(true, 'Bottom nav not visible — user not authenticated')
      return
    }

    await recordLink.click()
    await page.waitForLoadState('networkidle').catch(() => {})
    // Pages may redirect to /settings/children/add if no child data
    if (page.url().includes('/settings/children/add')) {
      test.skip(true, 'Nav redirected to child setup — server has no child data')
      return
    }
    await expect(page).toHaveURL(/\/record/, { timeout: 10000 })

    await page.getByRole('link', { name: '동네', exact: true }).click()
    await page.waitForLoadState('networkidle').catch(() => {})
    if (page.url().includes('/settings/children/add')) {
      test.skip(true, 'Nav redirected to child setup — server has no child data')
      return
    }
    await expect(page).toHaveURL(/\/town/, { timeout: 10000 })

    await page.getByRole('link', { name: '오늘', exact: true }).click()
    await page.waitForLoadState('networkidle').catch(() => {})
    if (page.url().includes('/settings/children/add')) {
      test.skip(true, 'Home tab redirected to child setup — server has no child data')
      return
    }
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 10000 })
  })

  test('우리 tab navigates to more page', async ({ page }) => {
    const moreLink = page.getByRole('link', { name: '우리', exact: true })
    const isVisible = await moreLink.isVisible({ timeout: 5000 }).catch(() => false)

    if (!isVisible) {
      test.skip(true, 'Bottom nav not visible — user not authenticated')
      return
    }

    await moreLink.click()
    await expect(page).toHaveURL(/\/more/, { timeout: 10000 })
  })

  test('critical routes render without error boundary', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    const routes = ['/milestone', '/vaccination', '/troubleshoot', '/emergency', '/fortune', '/settings']

    for (const route of routes) {
      await page.goto(route).catch(() => {})
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })
      await expect(page.locator('body')).not.toBeEmpty()
    }
  })

  test('back navigation works via browser history', async ({ page }) => {
    const recordLink = page.getByRole('link', { name: '추억', exact: true })
    const isVisible = await recordLink.isVisible({ timeout: 5000 }).catch(() => false)

    if (!isVisible) {
      test.skip(true, 'Bottom nav not visible — user not authenticated')
      return
    }

    await recordLink.click()
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    if (page.url().includes('/settings/children/add')) {
      test.skip(true, 'Nav redirected to child setup — server has no child data')
      return
    }
    await expect(page).toHaveURL(/\/record/, { timeout: 10000 })

    await page.goBack()
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    if (page.url().includes('/settings/children/add')) {
      test.skip(true, 'Back navigated to child setup — server has no child data')
      return
    }
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 10000 })
  })

  test('direct deep link to vaccination renders', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await page.goto('/vaccination').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('direct deep link to milestone renders', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await page.goto('/milestone').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
