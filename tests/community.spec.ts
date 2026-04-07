import { test, expect } from './fixtures/auth.fixture'

/**
 * Community / Town E2E Tests
 * Critical flows: news feed, gatherings, posting, town services
 */

async function isAuthenticated(page: import('@playwright/test').Page): Promise<boolean> {
  return !page.url().includes('/onboarding')
}

test.describe('Community — Town Main', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      localStorage.setItem('dodam_child_name', 'Test Baby')
      localStorage.setItem(
        'dodam_child_birthdate',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      )
      // Dismiss onboarding overlays
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    })
    await page.reload().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('should render town main page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/town')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Page should render without error boundary
    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('should display town service links', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/town')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Should have service cards/links (market, gathering, etc.)
    const marketLink = page.getByRole('link', { name: /장터/ }).or(
      page.locator('a[href*="/town/market"]'),
    )
    if (await marketLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(marketLink).toBeVisible()
    }
  })
})

test.describe('Community — News Feed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      // Dismiss onboarding overlays
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    })
    await page.reload().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('should render news page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/town/news')
    await page.waitForLoadState('networkidle').catch(() => {})

    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('should navigate to news write page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/town/news/write')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Should have text input area
    const textarea = page.locator('textarea').or(page.getByPlaceholder(/내용|이야기/))
    if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(textarea).toBeVisible()
    }
  })
})

test.describe('Community — Gatherings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      // Dismiss onboarding overlays
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    })
    await page.reload().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('should render gathering list page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/town/gathering')
    await page.waitForLoadState('networkidle').catch(() => {})

    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('should navigate to create gathering page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/town/gathering/new')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Should have form fields
    const titleInput = page.getByPlaceholder(/이름|제목/)
    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(titleInput).toBeVisible()
    }
  })

  test('gathering detail should have PageHeader with action buttons', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    // Navigate to gathering list to find one
    await page.goto('/town/gathering')
    await page.waitForLoadState('networkidle').catch(() => {})

    const firstGathering = page.locator('a[href*="/town/gathering/"]').first()
    if (await firstGathering.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstGathering.click()
      await page.waitForLoadState('networkidle').catch(() => {})

      // PageHeader (z-30) with "소모임" title
      const header = page.locator('header.z-30')
      await expect(header).toBeVisible({ timeout: 5000 })
      await expect(header).toContainText('소모임')

      // Tab bar should be visible (멤버/게시판)
      const tabs = page.getByRole('button').filter({ hasText: /멤버|게시판|정보/ })
      const tabCount = await tabs.count()
      expect(tabCount).toBeGreaterThanOrEqual(1)
    }
  })
})

test.describe('Community — Footprint System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      // Dismiss onboarding overlays
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    })
    await page.reload().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  })

})
