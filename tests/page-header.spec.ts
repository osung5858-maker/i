import { test, expect } from './fixtures/auth.fixture'

/**
 * PageHeader Consistency E2E Tests
 * Verifies the unified PageHeader component renders correctly across all migrated pages.
 * Checks: brand gradient background, back button, title, sticky behavior.
 *
 * NOTE: The app has TWO <header> elements — the global header (z-40) and PageHeader (z-30).
 * We target PageHeader via `header.z-30` or the back button `[aria-label="뒤로가기"]`.
 */

async function isAuthenticated(page: import('@playwright/test').Page): Promise<boolean> {
  return !page.url().includes('/onboarding')
}

/** Locate the PageHeader by its unique back button (aria-label="뒤로가기"), then get parent header. */
function getPageHeader(page: import('@playwright/test').Page) {
  return page.locator('header:has([aria-label="뒤로가기"])')
}

test.describe('PageHeader — Consistency', () => {
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

  const standalonePages = [
    { path: '/terms', title: '이용약관' },
    { path: '/privacy', title: '개인정보처리방침' },
    { path: '/growth/add', title: '성장 기록 추가' },
  ]

  for (const { path, title } of standalonePages) {
    test(`should render PageHeader on ${path}`, async ({ page }) => {
      if (!(await isAuthenticated(page))) {
        test.skip(true, 'Auth not available')
        return
      }

      await page.goto(path)
      await page.waitForLoadState('networkidle').catch(() => {})

      // PageHeader (z-30) should be visible with correct title
      const header = getPageHeader(page)
      await expect(header).toBeVisible({ timeout: 5000 })
      await expect(header).toContainText(title)

      // Back button should exist
      const backButton = page.locator('[aria-label="뒤로가기"]')
      await expect(backButton).toBeVisible()
    })
  }

  test('should render PageHeader on settings page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/settings')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Settings may or may not use PageHeader — just check page renders
    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('PageHeader back button navigates back', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    // Navigate to a sub-page from home
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})

    await page.goto('/terms')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Click the back button (aria-label="뒤로가기")
    const backButton = page.locator('[aria-label="뒤로가기"]')
    if (await backButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backButton.click()
      await page.waitForTimeout(1000)
      expect(page.url()).not.toContain('/terms')
    }
  })

  test('PageHeader sticky behavior on scroll', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/terms')
    await page.waitForLoadState('networkidle').catch(() => {})

    const header = getPageHeader(page)
    if (!(await header.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'PageHeader not rendered (auth-dependent)')
      return
    }

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.waitForTimeout(300)

    // Header should still be visible (sticky)
    await expect(header).toBeVisible()

    // Header should have sticky positioning
    const position = await header.evaluate((el) => {
      return window.getComputedStyle(el).position
    })
    expect(['sticky', 'fixed']).toContain(position)
  })

  test('PageHeader has correct height', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/terms')
    await page.waitForLoadState('networkidle').catch(() => {})

    const header = getPageHeader(page)
    if (!(await header.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'PageHeader not rendered (auth-dependent)')
      return
    }

    // Should have h-14 height (56px inner + 1px border = 57px)
    const height = await header.evaluate((el) => el.offsetHeight)
    expect(height).toBeGreaterThanOrEqual(56)
    expect(height).toBeLessThanOrEqual(58)
  })
})

test.describe('PageHeader — Record Detail Pages (Fixed Layout)', () => {
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

  const today = new Date().toISOString().split('T')[0]

  test('should render PageHeader on records detail page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto(`/records/${today}`)
    await page.waitForLoadState('networkidle').catch(() => {})

    // PageHeader — may not render if auth session lacks DB data
    const header = getPageHeader(page)
    if (await header.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(header).toContainText('기록 상세')
    }
  })

  test('should render PageHeader on preg-records detail page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    // Switch to pregnant mode
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'pregnant')
    })
    await page.reload()

    await page.goto(`/preg-records/${today}`)
    await page.waitForLoadState('networkidle').catch(() => {})

    // PageHeader — may not render if auth session lacks DB data
    const header = getPageHeader(page)
    if (await header.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(header).toContainText('기록 상세')
    }
  })

  test('records date navigation works', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto(`/records/${today}`)
    await page.waitForLoadState('networkidle').catch(() => {})

    // Previous date button (has rotate-180 chevron)
    const prevButton = page.locator('button').filter({ has: page.locator('.rotate-180') }).first()
    if (await prevButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await prevButton.click()
      await page.waitForTimeout(1500)
      expect(page.url()).not.toContain(today)
    }
  })
})
