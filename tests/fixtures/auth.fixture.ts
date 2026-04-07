import { test as base } from '@playwright/test'
import { OnboardingPage } from '../page-objects/OnboardingPage'
import { HomePage } from '../page-objects/HomePage'
import { PregnantPage } from '../page-objects/PregnantPage'
import { SettingsPage } from '../page-objects/SettingsPage'
import { CheckupPage } from '../page-objects/CheckupPage'
import { ChatListPage, ChatRoomPage } from '../page-objects/ChatPage'
import { TownPage, GatheringPage } from '../page-objects/TownPage'

/**
 * Auth Fixture
 * Extends Playwright test with authenticated context and page objects
 *
 * Usage:
 * ```ts
 * test('example', async ({ authenticatedPage, homePage }) => {
 *   await homePage.goto()
 *   await homePage.requestAiCare()
 * })
 * ```
 */

type AuthFixtures = {
  onboardingPage: OnboardingPage
  homePage: HomePage
  pregnantPage: PregnantPage
  settingsPage: SettingsPage
  checkupPage: CheckupPage
  chatListPage: ChatListPage
  chatRoomPage: ChatRoomPage
  townPage: TownPage
  gatheringPage: GatheringPage
  authenticatedPage: void // Auto-login fixture
}

export const test = base.extend<AuthFixtures>({
  onboardingPage: async ({ page }, use) => {
    await use(new OnboardingPage(page))
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page))
  },

  pregnantPage: async ({ page }, use) => {
    await use(new PregnantPage(page))
  },

  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page))
  },

  checkupPage: async ({ page }, use) => {
    await use(new CheckupPage(page))
  },

  chatListPage: async ({ page }, use) => {
    await use(new ChatListPage(page))
  },

  chatRoomPage: async ({ page }, use) => {
    await use(new ChatRoomPage(page))
  },

  townPage: async ({ page }, use) => {
    await use(new TownPage(page))
  },

  gatheringPage: async ({ page }, use) => {
    await use(new GatheringPage(page))
  },

  /**
   * Auto-login fixture
   * Reuses auth state from global setup
   */
  authenticatedPage: async ({ page }, use) => {
    // Auth state is already loaded from storageState in playwright.config.ts
    // This fixture just ensures the page is ready
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify authentication
    const isAuthenticated = await page.evaluate(() => {
      return !!localStorage.getItem('dodam_mode')
    })

    if (!isAuthenticated) {
      throw new Error('Authentication failed - user not logged in')
    }

    await use()
  },
})

export { expect } from '@playwright/test'
