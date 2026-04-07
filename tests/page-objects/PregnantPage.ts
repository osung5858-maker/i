import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Pregnant Mode Page Object
 * Pregnancy tracking with weekly fetal development, D-day, and health records
 */
export class PregnantPage extends BasePage {
  // Header
  readonly dDayBadge: Locator
  readonly weekInfo: Locator

  // Fetal Development Card
  readonly fetalDevCard: Locator
  readonly weeklyTip: Locator

  // Health Tracking
  readonly weightCard: Locator
  readonly fetalMovementCard: Locator
  readonly supplementCard: Locator

  // Diary
  readonly diaryButton: Locator
  readonly checkupButton: Locator

  // Quick Record Buttons
  readonly moodButton: Locator
  readonly fetalMoveButton: Locator
  readonly supplementButton: Locator

  constructor(page: Page) {
    super(page)

    // Header
    this.dDayBadge = page.getByText(/D-\d+|D\+\d+/)
    this.weekInfo = page.getByText(/\d+주/)

    // Cards
    this.fetalDevCard = page.getByText(/태아 발달/).locator('..')
    this.weightCard = page.getByText(/체중/).locator('..')
    this.fetalMovementCard = page.getByText(/태동/).locator('..')
    this.supplementCard = page.getByText(/영양제/).locator('..')

    // Buttons
    this.diaryButton = page.getByRole('link', { name: /기다림 일기/ })
    this.checkupButton = page.getByRole('link', { name: /검진/ })
    this.moodButton = page.getByRole('button', { name: /기분/ })
    this.fetalMoveButton = page.getByRole('button', { name: /태동/ })
    this.supplementButton = page.getByRole('button', { name: /영양제/ })
  }

  async goto() {
    // Dismiss onboarding overlays before navigating
    await this.page.evaluate(() => {
      localStorage.setItem('dodam_guide_pregnant', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    }).catch(() => {})
    await super.goto('/pregnant')
    await this.waitForLoadingComplete()
  }

  async isOnPregnantPage(): Promise<boolean> {
    return await this.fetalDevCard.isVisible()
  }

  /**
   * Get current pregnancy week
   */
  async getCurrentWeek(): Promise<number> {
    const weekText = await this.weekInfo.textContent()
    const match = weekText?.match(/(\d+)주/)
    return match ? parseInt(match[1]) : 0
  }

  /**
   * Get D-day
   */
  async getDDay(): Promise<number> {
    const dDayText = await this.dDayBadge.textContent()
    const match = dDayText?.match(/D([+-])(\d+)/)
    if (!match) return 0
    const days = parseInt(match[2])
    return match[1] === '-' ? days : -days
  }

  /**
   * Record mood
   */
  async recordMood(mood: 'happy' | 'excited' | 'calm' | 'tired' | 'anxious' | 'sick') {
    await this.page.evaluate((m) => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: `preg_mood_${m}` }
      }))
    }, mood)
    await this.waitForToast()
  }

  /**
   * Record fetal movement
   */
  async recordFetalMovement() {
    await this.page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'preg_fetal_move' }
      }))
    })
    await this.waitForToast()
  }

  /**
   * Record supplement intake
   */
  async recordSupplement(type: 'folic' | 'iron' | 'dha' | 'calcium' | 'vitd') {
    await this.page.evaluate((t) => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: `preg_${t}` }
      }))
    }, type)
    await this.waitForToast()
  }

  /**
   * Navigate to diary
   */
  async goToDiary() {
    await this.diaryButton.click()
    await this.waitForNavigation(/\/preg-diary/)
  }

  /**
   * Navigate to checkup records
   */
  async goToCheckup() {
    await this.checkupButton.click()
    await this.waitForNavigation(/\/preg-records/)
  }
}
