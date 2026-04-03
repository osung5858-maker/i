import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Onboarding Page Object
 * Handles login and mode selection
 */
export class OnboardingPage extends BasePage {
  readonly kakaoLoginButton: Locator
  readonly googleLoginButton: Locator
  readonly preparingModeButton: Locator
  readonly pregnantModeButton: Locator
  readonly parentingModeButton: Locator

  constructor(page: Page) {
    super(page)

    // Login buttons - use text content for robustness
    this.kakaoLoginButton = page.getByRole('button', { name: /카카오로 시작하기/ })
    this.googleLoginButton = page.getByRole('button', { name: /Google로 시작하기/ })

    // Mode selection buttons
    this.preparingModeButton = page.getByRole('button', { name: /임신 준비 중/ })
    this.pregnantModeButton = page.getByRole('button', { name: /임신 중/ })
    this.parentingModeButton = page.getByRole('button', { name: /육아 중/ })
  }

  async goto() {
    await super.goto('/onboarding')
  }

  async isOnLoginScreen(): Promise<boolean> {
    return await this.kakaoLoginButton.isVisible()
  }

  async isOnModeSelectionScreen(): Promise<boolean> {
    return await this.preparingModeButton.isVisible()
  }

  /**
   * Note: Actual OAuth login requires browser automation
   * This is a placeholder for e2e with mocked auth
   */
  async loginWithKakao() {
    await this.kakaoLoginButton.click()
    // OAuth flow happens in external window
    // In real tests, use auth fixtures or mock
  }

  async selectMode(mode: 'preparing' | 'pregnant' | 'parenting') {
    const button = mode === 'preparing'
      ? this.preparingModeButton
      : mode === 'pregnant'
      ? this.pregnantModeButton
      : this.parentingModeButton

    await button.click()
    await this.waitForNavigation()
  }
}
