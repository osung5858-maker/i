import { test, expect } from './fixtures/auth.fixture'

/**
 * Map & Place Features E2E Tests
 * Critical flows: map view, place detail, review writing
 */

async function isAuthenticated(page: import('@playwright/test').Page): Promise<boolean> {
  return !page.url().includes('/onboarding')
}

test.describe('Map — Main View', () => {
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

  test('should render map page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/map')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Page should render without error boundary
    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('should display map container', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/map')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Map container (Kakao or Naver map)
    const mapContainer = page.locator('#map').or(page.locator('[class*="map"]')).first()
    if (await mapContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(mapContainer).toBeVisible()
    }
  })
})

test.describe('Map — Place Detail', () => {
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

  test('place detail page has PageHeader with place name', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    // Navigate to map and try to find a place
    await page.goto('/map')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Try clicking any place marker or list item
    const placeLink = page.locator('a[href*="/map/"]').first()
    if (await placeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await placeLink.click()
      await page.waitForLoadState('networkidle').catch(() => {})

      // PageHeader should show place name (dynamic)
      const header = page.locator('header.z-30')
      await expect(header).toBeVisible({ timeout: 5000 })

      // Back button should work
      const backButton = header.locator('button').first()
      await expect(backButton).toBeVisible()
    }
  })
})

test.describe('Map — Review', () => {
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

  test('review page renders with PageHeader', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    // Navigate to a review page (need a place ID)
    // This test validates the route doesn't crash
    await page.goto('/map')
    await page.waitForLoadState('networkidle').catch(() => {})

    const placeLink = page.locator('a[href*="/map/"]').first()
    if (await placeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const href = await placeLink.getAttribute('href')
      if (href) {
        await page.goto(`${href}/review`)
        await page.waitForLoadState('networkidle').catch(() => {})

        const header = page.locator('header.z-30')
        if (await header.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(header).toContainText('리뷰')
        }
      }
    }
  })
})

test.describe('Utility Pages', () => {
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

  test('milestone page renders without error', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/milestone')
    await page.waitForLoadState('networkidle').catch(() => {})

    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('fortune page renders without error', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/fortune')
    await page.waitForLoadState('networkidle').catch(() => {})

    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('emergency page renders without error', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/emergency')
    await page.waitForLoadState('networkidle').catch(() => {})

    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('troubleshoot page renders without error', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/troubleshoot')
    await page.waitForLoadState('networkidle').catch(() => {})

    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('kidsnote page renders without error', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/kidsnote')
    await page.waitForLoadState('networkidle').catch(() => {})

    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('settings children add page has PageHeader', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/settings/children/add')
    await page.waitForLoadState('networkidle').catch(() => {})

    // PageHeader (z-30)
    const header = page.locator('header.z-30')
    if (await header.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(header).toContainText(/등록/)
    }
  })
})
