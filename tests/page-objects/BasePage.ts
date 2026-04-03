import { Page, Locator } from '@playwright/test'

/**
 * Base Page Object - Common methods for all pages
 */
export class BasePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '') {
    await this.page.goto(path)
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(url?: string | RegExp) {
    await this.page.waitForURL(url || /.*/)
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible()
  }

  /**
   * Get text content
   */
  async getTextContent(selector: string): Promise<string> {
    return (await this.page.locator(selector).textContent()) || ''
  }

  /**
   * Click with retry (handles mobile interactions)
   */
  async clickWithRetry(locator: Locator, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await locator.click({ timeout: 5000 })
        return
      } catch (e) {
        if (i === retries - 1) throw e
        await this.page.waitForTimeout(500)
      }
    }
  }

  /**
   * Fill input with validation
   */
  async fillInput(locator: Locator, value: string) {
    await locator.clear()
    await locator.fill(value)
    await locator.blur() // Trigger validation
  }

  /**
   * Wait for loading state to finish
   */
  async waitForLoadingComplete() {
    await this.page.waitForLoadState('networkidle')
    // Wait for shimmer animations to disappear
    await this.page.waitForSelector('.shimmer', { state: 'hidden', timeout: 10000 }).catch(() => {})
  }

  /**
   * Check for toast message
   */
  async waitForToast(message?: string | RegExp): Promise<boolean> {
    const toast = this.page.getByRole('alert').or(this.page.locator('[role="status"]'))
    await toast.waitFor({ state: 'visible', timeout: 5000 })

    if (message) {
      const content = await toast.textContent()
      if (typeof message === 'string') {
        return content?.includes(message) || false
      }
      return message.test(content || '')
    }
    return true
  }

  /**
   * Dismiss modal/sheet by backdrop click
   */
  async dismissModal() {
    // Click backdrop (common pattern in the app)
    await this.page.locator('[role="dialog"]').press('Escape')
  }
}
