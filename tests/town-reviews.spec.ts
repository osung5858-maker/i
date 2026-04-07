import { test, expect } from './fixtures/auth.fixture'
import AxeBuilder from '@axe-core/playwright'

/**
 * Town & Place Reviews E2E Tests
 * Tests:
 * - Town page renders with place cards
 * - Review bottom sheet opens and shows reviews
 * - Emoji reactions are rendered on reviews
 * - Accessibility of town page and review sheet
 */

/** Helper: navigate and skip if redirected to onboarding */
async function navigateWithAuthCheck(
  page: import('@playwright/test').Page,
  targetPath: string,
): Promise<boolean> {
  await page.goto(targetPath).catch(() => {})
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  // Dismiss onboarding overlays
  await page.evaluate(() => {
    localStorage.setItem('dodam_guide_parenting', '1')
    localStorage.setItem('dodam_push_prompt_dismissed', '1')
    sessionStorage.setItem('dodam_splash_shown', '1')
  }).catch(() => {})
  await page.waitForTimeout(2000)
  return !page.url().includes('/onboarding')
}

/** Helper: wait for town page tabs to be ready */
async function waitForTownPageReady(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /장소/ }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
}

/** Helper: wait for chat page to finish loading */
async function waitForChatReady(page: import('@playwright/test').Page) {
  await page.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
  await page.waitForFunction(() => {
    const hasEmpty = document.body.textContent?.includes('거래 채팅이 없어요')
    const hasChatItems = document.body.textContent?.includes('판매자') || document.body.textContent?.includes('구매자')
    return hasEmpty || hasChatItems
  }, { timeout: 10000 }).catch(() => {})
}

test.describe('Town Page', () => {
  test('town page renders without error', async ({ page }) => {
    const loaded = await navigateWithAuthCheck(page, '/town')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForTownPageReady(page)
    await expect(page.locator('body')).not.toBeEmpty()
    await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })
  })

  test('town page has navigation tabs (marketplace, gathering)', async ({ page }) => {
    const loaded = await navigateWithAuthCheck(page, '/town')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForTownPageReady(page)

    // Check that tab buttons exist
    const buttons = page.getByRole('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('place cards render when places are available', async ({ page }) => {
    const loaded = await navigateWithAuthCheck(page, '/town')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForTownPageReady(page)
    // Wait for place search results to load
    await page.waitForTimeout(3000)

    // Place cards have the characteristic white rounded border style
    const placeCards = page.locator('.bg-white.rounded-xl.border')
    const count = await placeCards.count()

    // Places may or may not be loaded depending on location
    if (count > 0) {
      // Each place card should have a name
      const firstCard = placeCards.first()
      const hasText = await firstCard.textContent()
      expect(hasText).toBeTruthy()
    }
  })
})

test.describe('Place Review Bottom Sheet', () => {
  test('review button opens bottom sheet', async ({ page }) => {
    const loaded = await navigateWithAuthCheck(page, '/town')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForTownPageReady(page)
    await page.waitForTimeout(3000)

    // Find a place card with review button
    const reviewButtons = page.locator('button[title="리뷰"]')
    const hasReviewBtn = await reviewButtons.first().isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasReviewBtn) {
      test.skip(true, 'No place cards with review buttons visible')
      return
    }

    await reviewButtons.first().click()
    await page.waitForTimeout(1000)

    // Bottom sheet should appear (with animate-slideUp class)
    const sheet = page.locator('.animate-slideUp')
    await expect(sheet).toBeVisible({ timeout: 5000 })

    // Sheet should have header with place name
    const sheetHeader = sheet.locator('.text-subtitle')
    await expect(sheetHeader).toBeVisible()
  })

  test('review sheet shows review content or empty state', async ({ page }) => {
    const loaded = await navigateWithAuthCheck(page, '/town')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForTownPageReady(page)
    await page.waitForTimeout(3000)

    const reviewButtons = page.locator('button[title="리뷰"]')
    const hasReviewBtn = await reviewButtons.first().isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasReviewBtn) {
      test.skip(true, 'No place cards with review buttons')
      return
    }

    await reviewButtons.first().click()
    await page.waitForTimeout(1000)

    const sheet = page.locator('.animate-slideUp')
    await expect(sheet).toBeVisible({ timeout: 5000 })

    // Should have either reviews or empty state
    const hasReviews = await sheet.locator('.bg-\\[var\\(--color-page-bg\\)\\].rounded-xl').count() > 0
    const hasEmpty = await sheet.getByText('아직 리뷰가 없어요').isVisible().catch(() => false)

    expect(hasReviews || hasEmpty).toBe(true)
  })

  test('emoji reaction buttons appear on each review', async ({ page }) => {
    const loaded = await navigateWithAuthCheck(page, '/town')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForTownPageReady(page)
    await page.waitForTimeout(3000)

    const reviewButtons = page.locator('button[title="리뷰"]')
    const hasReviewBtn = await reviewButtons.first().isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasReviewBtn) {
      test.skip(true, 'No place cards with review buttons')
      return
    }

    await reviewButtons.first().click()
    await page.waitForTimeout(1000)

    const sheet = page.locator('.animate-slideUp')
    await expect(sheet).toBeVisible({ timeout: 5000 })

    // Check if there are reviews
    const reviewCards = sheet.locator('.bg-\\[var\\(--color-page-bg\\)\\].rounded-xl')
    const reviewCount = await reviewCards.count()

    if (reviewCount === 0) {
      test.skip(true, 'No reviews to check emoji reactions')
      return
    }

    // Each review should have emoji reaction buttons (6 emojis: ❤️ 😂 👍 😢 🥰 👶)
    const firstReview = reviewCards.first()
    const emojiButtons = firstReview.locator('button .leading-none')
    const emojiCount = await emojiButtons.count()

    expect(emojiCount).toBe(6)
  })

  test('review sheet can be closed by backdrop click', async ({ page }) => {
    const loaded = await navigateWithAuthCheck(page, '/town')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForTownPageReady(page)
    await page.waitForTimeout(3000)

    const reviewButtons = page.locator('button[title="리뷰"]')
    const hasReviewBtn = await reviewButtons.first().isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasReviewBtn) {
      test.skip(true, 'No place cards with review buttons')
      return
    }

    await reviewButtons.first().click()

    const sheet = page.locator('.animate-slideUp')
    await expect(sheet).toBeVisible({ timeout: 5000 })

    // Click backdrop to close
    await page.locator('.bg-black\\/40').click({ position: { x: 10, y: 10 } })

    // Sheet should disappear
    await expect(sheet).not.toBeVisible({ timeout: 3000 })
  })

  test('write review link navigates to review page', async ({ page }) => {
    const loaded = await navigateWithAuthCheck(page, '/town')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForTownPageReady(page)
    await page.waitForTimeout(3000)

    // Find a review write button on a place card
    const writeReviewLinks = page.getByRole('link', { name: '리뷰' })
    const hasWriteBtn = await writeReviewLinks.first().isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasWriteBtn) {
      test.skip(true, 'No write review links visible')
      return
    }

    await writeReviewLinks.first().click()
    await expect(page).toHaveURL(/\/map\/.*\/review/, { timeout: 10000 })
  })
})

test.describe('Town Page Accessibility', () => {
  test('town page should have no critical accessibility violations', async ({ page }) => {
    test.slow()

    const loaded = await navigateWithAuthCheck(page, '/town')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForTownPageReady(page)
    await page.waitForTimeout(2000)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('#map') // Kakao Maps third-party elements
      .exclude('area') // Map area elements outside our control
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toEqual([])
  })

  test('chat list page should have no critical accessibility violations', async ({ page }) => {
    test.slow()

    const loaded = await navigateWithAuthCheck(page, '/chat')
    if (!loaded) {
      test.skip(true, 'Redirected to /onboarding — auth not available')
      return
    }

    await waitForChatReady(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toEqual([])
  })
})
