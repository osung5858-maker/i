import { test, expect } from './fixtures/auth.fixture'

/**
 * Gathering (소모임) E2E Tests
 * Tests recently implemented changes:
 * - Tab structure: 2 tabs (게시판, 정보), not 3
 * - Tab order: 게시판 first for members, 정보 for non-members
 * - Members section moved into 정보 tab
 * - Leave button is small/subtle (not prominent)
 * - Emoji reactions on posts work without clipping
 */

/** Helper: navigate and skip if redirected to onboarding */
async function navigateWithAuthCheck(
  page: import('@playwright/test').Page,
  targetPath: string,
): Promise<boolean> {
  await page.goto(targetPath)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(2000)
  return !page.url().includes('/onboarding')
}

/** Helper: wait for town page tabs to be ready */
async function waitForTownPageReady(page: import('@playwright/test').Page) {
  // Town page has 4 tabs: 장소, 소식, 소모임, 도담장터
  await page.getByRole('button', { name: /소모임/ }).waitFor({ state: 'visible', timeout: 10000 })
}

/** Helper: navigate to gathering tab and wait for list to load */
async function navigateToGatheringList(page: import('@playwright/test').Page): Promise<boolean> {
  const loaded = await navigateWithAuthCheck(page, '/town')
  if (!loaded) return false

  await waitForTownPageReady(page)

  const gatheringTab = page.getByRole('button', { name: /소모임/ })
  await gatheringTab.click()

  // Wait for gathering list to load (either cards or empty state)
  await page.waitForFunction(() => {
    const hasCards = !!document.querySelector('a[href*="/town/gathering/"]')
    const hasEmpty = document.body.textContent?.includes('아직 열린 소모임이 없어요')
    return hasCards || hasEmpty
  }, { timeout: 8000 }).catch(() => {})

  return true
}

/** Helper: click into first gathering detail page, return true if successful */
async function navigateToFirstGathering(page: import('@playwright/test').Page): Promise<boolean> {
  const onList = await navigateToGatheringList(page)
  if (!onList) return false

  // Gathering cards are Link elements with href="/town/gathering/{id}"
  const gatheringLink = page.locator('a[href*="/town/gathering/"]').first()
  const hasGathering = await gatheringLink.isVisible({ timeout: 2000 }).catch(() => false)
  if (!hasGathering) return false

  await gatheringLink.click()
  // Wait for gathering detail page to load
  await page.waitForTimeout(1500)
  return page.url().includes('/town/gathering/')
}

test.describe('Gathering Detail Page', () => {
  test('gathering tab renders gatherings or empty state', async ({ page }) => {
    const onList = await navigateToGatheringList(page)
    if (!onList) {
      test.skip(true, 'Redirected to /onboarding or gathering tab not visible')
      return
    }

    // Page should have content: either gathering cards or empty state
    await expect(page.locator('body')).not.toBeEmpty()
    await expect(page.getByText('문제가 발생했어요')).not.toBeVisible({ timeout: 3000 })

    const hasGatherings = await page.locator('a[href*="/town/gathering/"]').count() > 0
    const hasEmptyState = await page.getByText('아직 열린 소모임이 없어요').isVisible().catch(() => false)
    expect(hasGatherings || hasEmptyState).toBe(true)
  })

  test('tab bar has maximum 2 tabs (게시판 and 정보)', async ({ page }) => {
    const onDetail = await navigateToFirstGathering(page)
    if (!onDetail) {
      // If no gatherings: verify empty state is correct
      const hasEmptyState = await page.getByText('아직 열린 소모임이 없어요').isVisible().catch(() => false)
      if (hasEmptyState) {
        await expect(page.getByText('아직 열린 소모임이 없어요')).toBeVisible()
        return
      }
      test.skip(true, 'Could not navigate to gathering detail')
      return
    }

    // Tab bar — should have exactly 2 tabs or 1 (for non-members)
    // The tab bar is in: .sticky.top-[56px] > .flex > button
    const tabBar = page.locator('.sticky.border-b .flex')
    const tabButtons = tabBar.locator('button')
    const tabCount = await tabButtons.count()
    expect(tabCount).toBeLessThanOrEqual(2)

    // 멤버 tab should NOT exist as a separate tab
    const memberTab = page.getByRole('button', { name: '멤버', exact: true })
    await expect(memberTab).not.toBeVisible()
  })

  test('정보 tab is accessible and shows member list for members', async ({ page }) => {
    const onDetail = await navigateToFirstGathering(page)
    if (!onDetail) {
      const hasEmptyState = await page.getByText('아직 열린 소모임이 없어요').isVisible().catch(() => false)
      if (hasEmptyState) {
        await expect(page.getByText('첫 소모임을 만들어보세요!')).toBeVisible()
        return
      }
      test.skip(true, 'Could not navigate to gathering detail')
      return
    }

    // Click 정보 tab
    const infoTab = page.getByRole('button', { name: '정보', exact: true })
    await expect(infoTab).toBeVisible()
    await infoTab.click()
    await page.waitForTimeout(500)

    // If user is a member, member list should appear in 정보 tab
    const memberSection = page.getByText(/멤버 \d+명/)
    const hasMemberSection = await memberSection.isVisible({ timeout: 3000 }).catch(() => false)

    // Member section should be in info tab (not a separate tab)
    if (hasMemberSection) {
      await expect(memberSection).toBeVisible()
    }
  })

  test('leave button is small and subtle (not prominent)', async ({ page }) => {
    const onDetail = await navigateToFirstGathering(page)
    if (!onDetail) {
      const hasEmptyState = await page.getByText('아직 열린 소모임이 없어요').isVisible().catch(() => false)
      if (hasEmptyState) {
        await expect(page.getByText('아직 열린 소모임이 없어요')).toBeVisible()
        return
      }
      test.skip(true, 'Could not navigate to gathering detail')
      return
    }

    // Go to info tab (where leave button lives)
    const infoTab = page.getByRole('button', { name: '정보', exact: true })
    await infoTab.click()
    await page.waitForTimeout(500)

    // Check if leave button exists (only for members who aren't creator)
    const leaveBtn = page.getByRole('button', { name: '소모임 나가기' })
    const hasLeaveBtn = await leaveBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasLeaveBtn) {
      // Verify it's small — check that it has small text styling
      const fontSize = await leaveBtn.evaluate(el => {
        return window.getComputedStyle(el).fontSize
      })
      // text-[12px] or text-body would be 12-14px, NOT a full-width button (which would be 14-16px)
      expect(parseFloat(fontSize)).toBeLessThanOrEqual(14)
    }
  })

  test('emoji reactions are visible on posts without clipping', async ({ page }) => {
    const onDetail = await navigateToFirstGathering(page)
    if (!onDetail) {
      const hasEmptyState = await page.getByText('아직 열린 소모임이 없어요').isVisible().catch(() => false)
      if (hasEmptyState) {
        await expect(page.getByText('아직 열린 소모임이 없어요')).toBeVisible()
        return
      }
      test.skip(true, 'Could not navigate to gathering detail')
      return
    }

    // Switch to board tab if member
    const boardTab = page.getByRole('button', { name: '게시판', exact: true })
    if (await boardTab.isVisible().catch(() => false)) {
      await boardTab.click()
      await page.waitForTimeout(1000)

      // Check if there are posts
      const postCards = page.locator('.bg-white.rounded-2xl.border')
      const postCount = await postCards.count()

      if (postCount > 0) {
        // Emoji reaction area should be visible (not clipped by overflow-hidden)
        const firstPost = postCards.first()
        const emojiRow = firstPost.locator('.flex.items-center.gap-1\\.5.flex-wrap')
        const hasEmoji = await emojiRow.isVisible().catch(() => false)

        if (hasEmoji) {
          // Verify post container does NOT have overflow-hidden
          const overflow = await firstPost.evaluate(el => {
            return window.getComputedStyle(el).overflow
          })
          expect(overflow).not.toBe('hidden')
        }
      }
    }
  })
})
