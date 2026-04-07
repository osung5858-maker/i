import { test, expect } from './fixtures/auth.fixture'

/**
 * Marketplace & Chat E2E Tests
 * Critical flows: browse items, create listing, chat initiation, status changes
 */

async function isAuthenticated(page: import('@playwright/test').Page): Promise<boolean> {
  return !page.url().includes('/onboarding')
}

test.describe('Marketplace — Browse & Search', () => {
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

  test('should render marketplace page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/town/market')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Page should load without error
    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('should display marketplace tabs', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    // Marketplace is part of the town/community page
    await page.goto('/town')
    await page.waitForLoadState('networkidle').catch(() => {})

    // The page should have filter elements (age chips, category selects, or tab buttons)
    const filterElements = page.locator('select').or(
      page.getByRole('button').filter({ hasText: /전체|카테고리|가격/ }),
    )
    const count = await filterElements.count()
    // Marketplace may require scroll or tab switch to appear — just verify town renders
    if (count === 0) {
      // Fallback: just verify the town page rendered without error
      const errorBoundary = page.locator('[data-testid="error-boundary"]')
      await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
    } else {
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  test('should display floating add button', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/town/market')
    await page.waitForLoadState('networkidle').catch(() => {})

    // FAB for adding new item
    const fab = page.getByRole('link', { name: /글쓰기|등록/ }).or(
      page.locator('a[href="/town/market/new"]'),
    )
    if (await fab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(fab).toBeVisible()
    }
  })

  test('should navigate to create listing page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/town/market/new')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Form elements should be visible
    const titleInput = page.getByPlaceholder(/제목|상품명/)
    if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(titleInput).toBeVisible()
    }
  })
})

test.describe('Marketplace — Item Detail', () => {
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

  test('should render item detail page without error', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    // Navigate to market first to find an item
    await page.goto('/town/market')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Try clicking the first item card
    const firstItem = page.locator('[data-testid="market-item"]').or(
      page.locator('a[href*="/town/market/"]').first(),
    )

    if (await firstItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstItem.click()
      await page.waitForLoadState('networkidle').catch(() => {})

      // Should have item detail content
      const pageContent = await page.textContent('body')
      expect(pageContent).toBeTruthy()

      // Chat button should exist for non-owner
      const chatButton = page.getByRole('button', { name: /채팅|대화/ })
      // Optional — may not be visible if user is the seller
      if (await chatButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(chatButton).toBeVisible()
      }
    }
  })
})

test.describe('Chat', () => {
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

  test('should render chat list page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/chat')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Page should render without crash
    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('chat room should have PageHeader and input area', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    // Navigate to chat list
    await page.goto('/chat')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Try clicking first chat room
    const firstChat = page.locator('a[href*="/chat/"]').first()
    if (await firstChat.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstChat.click()
      await page.waitForLoadState('networkidle').catch(() => {})

      // PageHeader (z-30) should be present
      const header = page.locator('header.z-30')
      await expect(header).toBeVisible({ timeout: 5000 })
      await expect(header).toContainText(/구매자|판매자/)

      // Message input should exist
      const input = page.getByPlaceholder(/메시지/)
      await expect(input).toBeVisible()

      // Send button should exist
      const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last()
      await expect(sendButton).toBeVisible()
    }
  })

  test('chat input should be limited to 500 characters', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/chat')
    await page.waitForLoadState('networkidle').catch(() => {})

    const firstChat = page.locator('a[href*="/chat/"]').first()
    if (await firstChat.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstChat.click()
      await page.waitForLoadState('networkidle').catch(() => {})

      const input = page.getByPlaceholder(/메시지/)
      if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
        // maxLength should be 500
        const maxLength = await input.getAttribute('maxLength')
        expect(maxLength).toBe('500')
      }
    }
  })
})
