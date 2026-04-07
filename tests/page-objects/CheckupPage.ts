import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Checkup Schedule Page Object
 * Located on /waiting page → 'checkup' (검진 관리) tab
 */
export class CheckupPage extends BasePage {
  // Tab navigation
  readonly checkupTab: Locator

  // D-day card
  readonly nextCheckupCard: Locator
  readonly dDayBadge: Locator

  // Timeline
  readonly timeline: Locator
  readonly timelineItems: Locator
  readonly progressText: Locator
  readonly addCustomButton: Locator

  // Schedule bottom sheet (fullscreen modal)
  readonly scheduleModal: Locator
  readonly scheduleSaveButton: Locator
  readonly scheduleCancelButton: Locator

  // Result bottom sheet
  readonly resultModal: Locator

  constructor(page: Page) {
    super(page)

    // Tab — plain <button> without role="tab"
    this.checkupTab = page.getByRole('button', { name: '검진 관리' })

    // Next Checkup Card
    this.nextCheckupCard = page.locator('text=다음 검진').locator('..')
    this.dDayBadge = page.getByText(/D-\d+|D-day|D\+\d+/)

    // Timeline section
    this.timeline = page.getByRole('list', { name: /검진 타임라인/ })
    this.timelineItems = this.timeline.getByRole('listitem')
    this.progressText = page.getByText(/\d+\/\d+ 완료/)
    this.addCustomButton = page.getByLabel('커스텀 검진 추가하기')

    // Schedule modal
    this.scheduleModal = page.locator('.fixed').filter({ hasText: '검진 예약' }).or(
      page.locator('.fixed').filter({ hasText: '예약 변경' })
    )
    // Bottom submit button: "저장하기" (create) or "수정하기" (edit)
    // Avoid header "저장" button which also matches non-exact queries
    this.scheduleSaveButton = page.getByRole('button', { name: '저장하기', exact: true }).or(
      page.getByRole('button', { name: '수정하기', exact: true })
    )
    this.scheduleCancelButton = page.getByRole('button', { name: '취소' })

    // Result modal
    this.resultModal = page.locator('.fixed').filter({ hasText: '검진 결과' })
  }

  async goto() {
    // First navigate to any page so we have a valid origin for localStorage
    await this.page.goto('/onboarding').catch(() => {})
    await this.page.waitForLoadState('domcontentloaded').catch(() => {})

    // Set pregnant mode in localStorage
    await this.page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'pregnant')
      localStorage.setItem('dodam_guide_pregnant', '1')
      localStorage.setItem('dodam_guide_waiting', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 200)
      localStorage.setItem('dodam_preg_duedate', dueDate.toISOString().split('T')[0])
    })

    // Navigate to /waiting (auth cookies from storageState bypass middleware)
    await this.page.goto('/waiting').catch(() => {})
    await this.page.waitForLoadState('domcontentloaded').catch(() => {})

    // Wait for any redirects to settle
    await this.page.waitForLoadState('networkidle').catch(() => {})

    // If redirected to onboarding, auth is not configured
    if (this.page.url().includes('/onboarding')) {
      throw new Error(
        'AUTH_MISSING: Redirected to /onboarding — need SUPABASE_SERVICE_ROLE_KEY in .env.local'
      )
    }

    // If redirected away from /waiting, the user's server-side mode isn't pregnant
    if (!this.page.url().includes('/waiting')) {
      throw new Error(
        'Timeout: Redirected away from /waiting to ' + this.page.url() + ' — user mode mismatch'
      )
    }

    // Dismiss any tutorial/onboarding overlay
    const closeBtn = this.page.locator('button:has-text("×"), button[aria-label="닫기"], button:has-text("건너뛰기"), button:has-text("다음")')
    for (let i = 0; i < 3; i++) {
      if (await closeBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.first().click()
        await this.page.waitForTimeout(300)
      } else {
        break
      }
    }

    // Switch to checkup tab
    await this.checkupTab.click()
    // Wait for timeline to load
    await this.timeline.waitFor({ state: 'visible', timeout: 15000 })
  }

  /**
   * Get count of timeline items
   */
  async getTimelineItemCount(): Promise<number> {
    return await this.timelineItems.count()
  }

  /**
   * Get progress (completed / total)
   */
  async getProgress(): Promise<{ completed: number; total: number }> {
    const text = await this.progressText.textContent()
    const match = text?.match(/(\d+)\/(\d+)/)
    if (!match) return { completed: 0, total: 0 }
    return { completed: parseInt(match[1]), total: parseInt(match[2]) }
  }

  /**
   * Click "예약하기" on a specific checkup item by title
   */
  async scheduleCheckup(title: string) {
    const item = this.timeline.getByRole('listitem').filter({ hasText: title })
    await item.getByRole('button', { name: '예약하기' }).click({ timeout: 10000 })
  }

  /**
   * Fill schedule form and save
   */
  async fillScheduleForm(data: {
    date: string
    time?: string
    hospital?: string
    memo?: string
  }) {
    // Date — click the date button to trigger native picker, then set via evaluate
    await this.page.evaluate((dateStr) => {
      const input = document.getElementById('schedule-date-input') as HTMLInputElement
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, 'value'
        )?.set
        nativeSetter?.call(input, dateStr)
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }, data.date)

    // Hospital
    if (data.hospital) {
      const hospitalInput = this.page.getByPlaceholder('병원명 입력')
      await hospitalInput.waitFor({ state: 'visible', timeout: 10000 })
      await hospitalInput.fill(data.hospital)
    }

    // Memo
    if (data.memo) {
      const memoInput = this.page.getByPlaceholder(/공복 필요/)
      await memoInput.fill(data.memo)
    }

    // Save
    await this.scheduleSaveButton.waitFor({ state: 'visible', timeout: 10000 })
    await this.scheduleSaveButton.click({ timeout: 10000 })
  }

  /**
   * Click "검진 완료" on a scheduled checkup
   */
  async completeCheckup(title: string) {
    const item = this.timeline.getByRole('listitem').filter({ hasText: title })
    await item.getByRole('button', { name: '검진 완료' }).click({ timeout: 10000 })
  }

  /**
   * Click "변경" on a scheduled checkup
   */
  async editSchedule(title: string) {
    const item = this.timeline.getByRole('listitem').filter({ hasText: title })
    await item.getByRole('button', { name: '변경' }).click({ timeout: 10000 })
  }

  /**
   * Click "결과 입력" on a completed checkup
   */
  async openResultInput(title: string) {
    const item = this.timeline.getByRole('listitem').filter({ hasText: title })
    await item.getByRole('button', { name: '결과 입력' }).click()
  }

  /**
   * Click "결과 보기" on a checkup with results
   */
  async viewResult(title: string) {
    const item = this.timeline.getByRole('listitem').filter({ hasText: title })
    await item.getByRole('button', { name: '결과 보기' }).click()
  }

  /**
   * Click "삭제" on a custom checkup
   */
  async deleteCheckup(title: string) {
    const item = this.timeline.getByRole('listitem').filter({ hasText: title })
    await item.getByRole('button', { name: '삭제' }).click({ timeout: 10000 })
  }

  /**
   * Add a custom checkup
   */
  async addCustomCheckup(data: {
    title: string
    date: string
    hospital?: string
  }) {
    await this.addCustomButton.click({ timeout: 10000 })

    // Fill custom title
    await this.page.getByPlaceholder(/검진명 입력/).fill(data.title)

    // Date
    await this.page.evaluate((dateStr) => {
      const input = document.getElementById('schedule-date-input') as HTMLInputElement
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, 'value'
        )?.set
        nativeSetter?.call(input, dateStr)
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }, data.date)

    if (data.hospital) {
      const hospitalInput = this.page.getByPlaceholder('병원명 입력')
      await hospitalInput.waitFor({ state: 'visible', timeout: 10000 })
      await hospitalInput.fill(data.hospital)
    }

    await this.scheduleSaveButton.waitFor({ state: 'visible', timeout: 10000 })
    await this.scheduleSaveButton.click({ timeout: 10000 })
  }

  /**
   * Check if a timeline item has a specific status icon
   */
  async getItemStatus(title: string): Promise<'pending' | 'scheduled' | 'completed'> {
    const item = this.timeline.getByRole('listitem').filter({ hasText: title })

    // Check for checkmark (completed)
    const hasCheck = await item.locator('svg path[d*="M3 8l4 4"]').count()
    if (hasCheck > 0) return 'completed'

    // Check for calendar icon (scheduled)
    const hasCalendar = await item.locator('svg rect').count()
    if (hasCalendar > 0) return 'scheduled'

    return 'pending'
  }

  /**
   * Check if D-day card is visible
   */
  async hasNextCheckupCard(): Promise<boolean> {
    return await this.nextCheckupCard.isVisible()
  }
}
