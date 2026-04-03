import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Settings Page Object
 * User profile, children management, caregivers
 */
export class SettingsPage extends BasePage {
  // Profile Section
  readonly profileAvatar: Locator
  readonly userName: Locator

  // Children Management
  readonly childrenSection: Locator
  readonly addChildButton: Locator
  readonly childList: Locator

  // Caregivers
  readonly caregiversButton: Locator
  readonly inviteButton: Locator

  // Account
  readonly logoutButton: Locator
  readonly deleteAccountButton: Locator

  // Privacy
  readonly termsButton: Locator
  readonly privacyButton: Locator

  constructor(page: Page) {
    super(page)

    // Profile
    this.profileAvatar = page.locator('img[alt*="프로필"]')
    this.userName = page.getByText(/님/)

    // Children
    this.childrenSection = page.getByText(/아이 정보/).locator('..')
    this.addChildButton = page.getByRole('link', { name: /아이 추가/ })
    this.childList = page.locator('[data-testid="child-list"]')

    // Caregivers
    this.caregiversButton = page.getByRole('link', { name: /양육자 관리/ })
    this.inviteButton = page.getByRole('link', { name: /초대/ })

    // Account
    this.logoutButton = page.getByRole('button', { name: /로그아웃/ })
    this.deleteAccountButton = page.getByRole('button', { name: /회원탈퇴/ })

    // Privacy
    this.termsButton = page.getByRole('link', { name: /이용약관/ })
    this.privacyButton = page.getByRole('link', { name: /개인정보/ })
  }

  async goto() {
    await super.goto('/settings')
    await this.waitForLoadingComplete()
  }

  /**
   * Add a new child
   */
  async addChild(data: {
    name: string
    birthdate: string
    gender?: 'male' | 'female'
  }) {
    await this.addChildButton.click()
    await this.waitForNavigation(/\/settings\/children\/add/)

    // Fill form
    await this.page.getByLabel(/이름/).fill(data.name)
    await this.page.getByLabel(/생년월일/).fill(data.birthdate)

    if (data.gender) {
      const genderButton = this.page.getByRole('button', {
        name: data.gender === 'male' ? /남/ : /여/
      })
      await genderButton.click()
    }

    // Submit
    await this.page.getByRole('button', { name: /저장|완료/ }).click()
    await this.waitForNavigation(/\/settings/)
  }

  /**
   * Edit child info
   */
  async editChild(childName: string, newData: { name?: string; birthdate?: string }) {
    const childCard = this.page.getByText(childName).locator('..')
    await childCard.click()
    await this.waitForNavigation(/\/settings\/children\//)

    if (newData.name) {
      const nameInput = this.page.getByLabel(/이름/)
      await nameInput.clear()
      await nameInput.fill(newData.name)
    }

    if (newData.birthdate) {
      const birthdateInput = this.page.getByLabel(/생년월일/)
      await birthdateInput.clear()
      await birthdateInput.fill(newData.birthdate)
    }

    await this.page.getByRole('button', { name: /저장/ }).click()
    await this.waitForNavigation(/\/settings/)
  }

  /**
   * Logout
   */
  async logout() {
    await this.logoutButton.click()
    // Confirm dialog
    const confirmButton = this.page.getByRole('button', { name: /확인/ })
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
    await this.waitForNavigation(/\/onboarding/)
  }

  /**
   * Navigate to caregivers management
   */
  async goToCaregivers() {
    await this.caregiversButton.click()
    await this.waitForNavigation(/\/settings\/caregivers/)
  }

  /**
   * Invite caregiver
   */
  async inviteCaregiver() {
    await this.goToCaregivers()
    await this.inviteButton.click()

    // Copy invite link
    const inviteLink = await this.page.getByRole('textbox', { name: /초대 링크/ })
    return await inviteLink.inputValue()
  }
}
