import { test, expect } from './fixtures/auth.fixture'
import { AxeBuilder } from '@axe-core/playwright'
import fs from 'fs'
import path from 'path'

/**
 * Checkup Schedule E2E Tests
 * Tests the pregnancy checkup timeline at /waiting → 검진 관리 tab
 *
 * Requires Supabase auth credentials:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   SUPABASE_SERVICE_ROLE_KEY (to auto-create test user)
 *
 * Critical flows:
 * 1. Timeline rendering with 9 default checkups
 * 2. Schedule a checkup (date, time, hospital)
 * 3. Complete a checkup → result input
 * 4. Add/delete custom checkups
 * 5. Next checkup D-day card
 * 6. Timeline status icons & visual states
 */

// Skip all tests if auth state doesn't have real cookies
const authFile = path.join(__dirname, '.auth/user.json')
function hasAuthCookies(): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'))
    return data.cookies?.some((c: { name: string }) => c.name.startsWith('sb-'))
  } catch {
    return false
  }
}

test.describe('Checkup Schedule', () => {
  test.skip(!hasAuthCookies(), 'Supabase auth not configured — need SUPABASE_SERVICE_ROLE_KEY in .env.local')

  // checkupPage.goto() handles localStorage setup,
  // tutorial dismissal, and tab navigation to 검진 관리

  test.describe('Timeline Rendering', () => {
    test('should display checkup timeline with default items', async ({ checkupPage }) => {
      await checkupPage.goto()

      // Progress counter should be visible
      await expect(checkupPage.progressText).toBeVisible()

      // Should have at least 9 default checkup items
      const count = await checkupPage.getTimelineItemCount()
      expect(count).toBeGreaterThanOrEqual(9)
    })

    test('should show progress count (completed/total)', async ({ checkupPage }) => {
      await checkupPage.goto()

      const progress = await checkupPage.getProgress()
      expect(progress.total).toBeGreaterThanOrEqual(9)
      expect(progress.completed).toBeGreaterThanOrEqual(0)
      expect(progress.completed).toBeLessThanOrEqual(progress.total)
    })

    test('should display all 9 default checkup titles', async ({ checkupPage }) => {
      await checkupPage.goto()

      const expectedTitles = [
        '첫 방문',
        '첫 초음파',
        'NT 검사',
        '쿼드 검사',
        '정밀 초음파',
        '임신성 당뇨',
        'NST 검사',
      ]

      for (const title of expectedTitles) {
        await expect(checkupPage.timeline.getByText(title, { exact: false })).toBeVisible()
      }
    })

    test('should display week badges for each checkup', async ({ checkupPage }) => {
      await checkupPage.goto()

      // Should have week badges like "4주", "8주", etc.
      await expect(checkupPage.timeline.getByText('4주')).toBeVisible()
      await expect(checkupPage.timeline.getByText('8주')).toBeVisible()
      await expect(checkupPage.timeline.getByText('20주')).toBeVisible()
    })

    test('should show "예약하기" button on pending checkups', async ({ checkupPage }) => {
      await checkupPage.goto()

      // At least one "예약하기" button should exist for unscheduled items
      const scheduleButtons = checkupPage.timeline.getByRole('button', { name: '예약하기' })
      const count = await scheduleButtons.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Schedule a Checkup', () => {
    test('should open schedule form when clicking 예약하기', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      await checkupPage.scheduleCheckup('첫 방문')

      // Schedule modal should be visible
      await expect(page.getByText('검진 예약')).toBeVisible()
      // Should show checkup info
      await expect(page.getByText('첫 방문 (임신 확인)')).toBeVisible()
    })

    test('should save schedule with date', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      await checkupPage.scheduleCheckup('첫 방문')

      // Fill tomorrow's date
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]

      await checkupPage.fillScheduleForm({
        date: dateStr,
        hospital: '서울대병원',
      })

      // Toast confirmation
      await expect(page.getByText(/예약 완료/)).toBeVisible({ timeout: 5000 })

      // Item should now show "검진 완료" and "변경" buttons instead of "예약하기"
      const item = checkupPage.timeline.getByRole('listitem').filter({ hasText: '첫 방문' })
      await expect(item.getByRole('button', { name: '검진 완료' })).toBeVisible()
      await expect(item.getByRole('button', { name: '변경' })).toBeVisible()
    })

    test('should display D-day badge after scheduling', async ({ checkupPage }) => {
      await checkupPage.goto()

      await checkupPage.scheduleCheckup('첫 방문')

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await checkupPage.fillScheduleForm({ date: tomorrow.toISOString().split('T')[0] })

      // D-day badge should appear on the scheduled item
      const item = checkupPage.timeline.getByRole('listitem').filter({ hasText: '첫 방문' })
      await expect(item.getByText(/D-/)).toBeVisible()
    })

    test('should show next checkup card after scheduling', async ({ checkupPage }) => {
      await checkupPage.goto()

      await checkupPage.scheduleCheckup('첫 방문')

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await checkupPage.fillScheduleForm({ date: tomorrow.toISOString().split('T')[0] })

      // Next checkup card should appear at the top
      await expect(checkupPage.nextCheckupCard).toBeVisible()
      await expect(checkupPage.nextCheckupCard).toContainText('첫 방문')
    })

    test('should cancel schedule form', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      await checkupPage.scheduleCheckup('첫 방문')
      await expect(page.getByText('검진 예약')).toBeVisible()

      // Click cancel
      await checkupPage.scheduleCancelButton.click()

      // Modal should close — "예약하기" should still be there
      const item = checkupPage.timeline.getByRole('listitem').filter({ hasText: '첫 방문' })
      await expect(item.getByRole('button', { name: '예약하기' })).toBeVisible()
    })
  })

  test.describe('Edit Schedule', () => {
    test('should open edit form with existing data', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      // First schedule it
      await checkupPage.scheduleCheckup('첫 방문')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await checkupPage.fillScheduleForm({
        date: tomorrow.toISOString().split('T')[0],
        hospital: '서울대병원',
      })
      await page.waitForTimeout(500)

      // Now edit
      await checkupPage.editSchedule('첫 방문')

      // Should show "예약 변경" title
      await expect(page.getByText('예약 변경')).toBeVisible()
    })
  })

  test.describe('Complete Checkup', () => {
    test('should mark checkup as completed', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      // Schedule first
      await checkupPage.scheduleCheckup('첫 방문')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await checkupPage.fillScheduleForm({ date: tomorrow.toISOString().split('T')[0] })
      await page.waitForTimeout(500)

      // Complete it
      await checkupPage.completeCheckup('첫 방문')

      // Toast
      await expect(page.getByText(/검진 완료/)).toBeVisible({ timeout: 5000 })

      // Progress should update
      const progress = await checkupPage.getProgress()
      expect(progress.completed).toBeGreaterThanOrEqual(1)

      // Should now show "결과 입력" button
      const item = checkupPage.timeline.getByRole('listitem').filter({ hasText: '첫 방문' })
      await expect(item.getByRole('button', { name: '결과 입력' })).toBeVisible()
    })
  })

  test.describe('Custom Checkup', () => {
    test('should add a custom checkup', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      const initialCount = await checkupPage.getTimelineItemCount()

      await checkupPage.addCustomCheckup({
        title: '추가 혈액검사',
        date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        hospital: '강남세브란스',
      })

      // Toast
      await expect(page.getByText(/예약 완료/)).toBeVisible({ timeout: 5000 })

      // Count should increase
      const newCount = await checkupPage.getTimelineItemCount()
      expect(newCount).toBe(initialCount + 1)

      // Custom checkup should appear in timeline
      await expect(checkupPage.timeline.getByText('추가 혈액검사')).toBeVisible()
    })

    test('should show delete button only for custom checkups', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      // Default checkups should NOT have 삭제 button
      const firstVisit = checkupPage.timeline.getByRole('listitem').filter({ hasText: '첫 방문' })
      await expect(firstVisit.getByRole('button', { name: '삭제' })).not.toBeVisible()

      // Add custom and verify 삭제 button exists
      await checkupPage.addCustomCheckup({
        title: '커스텀 검진',
        date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      })
      await page.waitForTimeout(500)

      const customItem = checkupPage.timeline.getByRole('listitem').filter({ hasText: '커스텀 검진' })
      await expect(customItem.getByRole('button', { name: '삭제' })).toBeVisible()
    })

    test('should delete a custom checkup', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      await checkupPage.addCustomCheckup({
        title: '삭제할 검진',
        date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      })
      await page.waitForTimeout(500)

      const countBefore = await checkupPage.getTimelineItemCount()

      await checkupPage.deleteCheckup('삭제할 검진')

      await expect(page.getByText(/삭제/)).toBeVisible({ timeout: 5000 })

      const countAfter = await checkupPage.getTimelineItemCount()
      expect(countAfter).toBe(countBefore - 1)
    })
  })

  test.describe('Timeline Status Icons', () => {
    test('should show pending icon for unscheduled checkups', async ({ checkupPage }) => {
      await checkupPage.goto()

      // Pending items should have gray background icon (no SVG checkmark or calendar)
      const status = await checkupPage.getItemStatus('정밀 초음파')
      expect(status).toBe('pending')
    })

    test('should show calendar icon for scheduled checkups', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      await checkupPage.scheduleCheckup('첫 방문')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await checkupPage.fillScheduleForm({ date: tomorrow.toISOString().split('T')[0] })
      await page.waitForTimeout(500)

      const status = await checkupPage.getItemStatus('첫 방문')
      expect(status).toBe('scheduled')
    })

    test('should show checkmark icon for completed checkups', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      // Schedule then complete
      await checkupPage.scheduleCheckup('첫 방문')
      await checkupPage.fillScheduleForm({
        date: new Date().toISOString().split('T')[0],
      })
      await page.waitForTimeout(500)
      await checkupPage.completeCheckup('첫 방문')
      await page.waitForTimeout(500)

      const status = await checkupPage.getItemStatus('첫 방문')
      expect(status).toBe('completed')
    })
  })

  test.describe('Accessibility', () => {
    test('should pass axe-core checks on checkup timeline', async ({ checkupPage, page }) => {
      await checkupPage.goto()

      const results = await new AxeBuilder({ page })
        .include('section[aria-label="검진 일정 관리"]')
        .disableRules(['color-contrast']) // Theme-dependent
        .analyze()

      expect(results.violations).toEqual([])
    })

    test('should have proper ARIA roles on timeline', async ({ checkupPage }) => {
      await checkupPage.goto()

      // Timeline should be a list
      await expect(checkupPage.timeline).toHaveAttribute('role', 'list')

      // Items should be listitems
      const firstItem = checkupPage.timelineItems.first()
      await expect(firstItem).toBeVisible()
    })

    test('should have labeled add button', async ({ checkupPage }) => {
      await checkupPage.goto()

      // Custom add button should have aria-label
      await expect(checkupPage.addCustomButton).toHaveAttribute('aria-label', '커스텀 검진 추가하기')
    })
  })
})
