import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Home Page Object - Parenting Mode
 * Main dashboard with AI care card, quick buttons, and today's records
 */
export class HomePage extends BasePage {
  // Header
  readonly notificationButton: Locator

  // AI Care Card
  readonly aiCareCard: Locator
  readonly aiCareButton: Locator
  readonly shareButton: Locator

  // Today's Record Section
  readonly todayRecordSection: Locator
  readonly viewAllButton: Locator
  readonly eventList: Locator

  // Quick Action Cards
  readonly vaccinationCard: Locator
  readonly growthCard: Locator
  readonly kidsnoteCard: Locator

  // Mission Card
  readonly missionCard: Locator

  // FAB (Floating Action Button) - controlled by BottomNav
  readonly fabButton: Locator

  // Modals/Sheets
  readonly feedSheet: Locator
  readonly poopSheet: Locator
  readonly tempSheet: Locator
  readonly formulaModal: Locator

  constructor(page: Page) {
    super(page)

    // Header
    this.notificationButton = page.getByRole('link', { name: /알림/ })

    // AI Care Card
    this.aiCareCard = page.locator('[data-guide="ai-card"]')
    this.aiCareButton = page.getByRole('button', { name: /AI 케어받기/ })
    this.shareButton = page.getByRole('button', { name: /카톡 공유/ })

    // Today's Record
    this.todayRecordSection = page.getByText('오늘 기록').locator('..')
    this.viewAllButton = page.getByRole('link', { name: /전체보기/ })
    this.eventList = page.locator('.hide-scrollbar')

    // Cards
    this.vaccinationCard = page.getByRole('link', { name: /접종/ })
    this.growthCard = page.getByRole('link', { name: /성장 기록/ })
    this.kidsnoteCard = page.getByText('키즈노트').locator('..')

    // Mission
    this.missionCard = page.getByText(/부부 미션/).locator('..')

    // FAB - typically at bottom right
    this.fabButton = page.locator('[data-testid="fab"]')

    // Sheets/Modals
    this.feedSheet = page.locator('[role="dialog"]').filter({ hasText: /분유/ })
    this.poopSheet = page.locator('[role="dialog"]').filter({ hasText: /대변/ })
    this.tempSheet = page.locator('[role="dialog"]').filter({ hasText: /체온/ })
    this.formulaModal = page.locator('[role="dialog"]').filter({ hasText: /분유/ })
  }

  async goto() {
    await super.goto('/')
    await this.waitForLoadingComplete()
  }

  async isOnHomePage(): Promise<boolean> {
    return await this.aiCareCard.isVisible()
  }

  /**
   * Trigger AI Care Analysis
   */
  async requestAiCare() {
    await this.aiCareButton.waitFor({ state: 'visible' })
    await this.aiCareButton.click()
    // Wait for AI response
    await this.page.waitForSelector('text=/AI가 기록을 분석/', { state: 'hidden', timeout: 15000 })
  }

  /**
   * Share today's record via KakaoTalk
   */
  async shareToKakao() {
    await this.shareButton.click()
    // Kakao share SDK will open external window
    // Just verify button click works
  }

  /**
   * Get today's event count
   */
  async getTodayEventCount(): Promise<number> {
    const recordText = await this.todayRecordSection.textContent()
    const match = recordText?.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  /**
   * Record a quick event via FAB
   * In real implementation, FAB is in BottomNav component
   */
  async recordEvent(type: 'feed' | 'sleep' | 'poop' | 'pee' | 'temp' | 'bath') {
    // FAB dispatches custom event 'dodam-record'
    // Simulate by directly calling the event handlers
    await this.page.evaluate((eventType) => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: eventType }
      }))
    }, type)

    // Wait for toast confirmation
    await this.waitForToast()
  }

  /**
   * Fill formula amount in modal
   */
  async submitFormulaAmount(ml: number) {
    await this.formulaModal.waitFor({ state: 'visible' })
    const input = this.formulaModal.getByRole('spinbutton')
    await input.fill(ml.toString())
    await this.formulaModal.getByRole('button', { name: /확인|기록/ }).click()
    await this.waitForToast()
  }

  /**
   * Select poop status
   */
  async selectPoopStatus(status: 'normal' | 'soft' | 'hard') {
    await this.poopSheet.waitFor({ state: 'visible' })
    const statusButton = this.poopSheet.getByRole('button', { name: new RegExp(status === 'normal' ? '정상' : status === 'soft' ? '묽음' : '단단') })
    await statusButton.click()
    await this.waitForToast()
  }

  /**
   * Submit temperature
   */
  async submitTemperature(celsius: number) {
    await this.tempSheet.waitFor({ state: 'visible' })
    const input = this.tempSheet.getByRole('spinbutton')
    await input.fill(celsius.toString())
    await this.tempSheet.getByRole('button', { name: /확인|기록/ }).click()
    await this.waitForToast()
  }

  /**
   * Undo last action
   */
  async undoLastEvent() {
    const undoButton = this.page.getByRole('button', { name: /되돌리기/ })
    await undoButton.waitFor({ state: 'visible', timeout: 2000 })
    await undoButton.click()
  }

  /**
   * Navigate to vaccination page
   */
  async goToVaccination() {
    await this.vaccinationCard.click()
    await this.waitForNavigation(/\/vaccination/)
  }

  /**
   * Navigate to growth records
   */
  async goToGrowth() {
    await this.growthCard.click()
    await this.waitForNavigation(/\/record/)
  }

  /**
   * Check if offline mode banner is visible
   */
  async isOffline(): Promise<boolean> {
    return await this.page.getByText(/오프라인/).isVisible()
  }

  /**
   * Get pending sync count
   */
  async getPendingSyncCount(): Promise<number> {
    const banner = this.page.getByText(/오프라인/)
    if (!await banner.isVisible()) return 0

    const text = await banner.textContent()
    const match = text?.match(/(\d+)건 대기/)
    return match ? parseInt(match[1]) : 0
  }
}
