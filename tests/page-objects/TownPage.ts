import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Town Page Object — /town
 * Community hub: marketplace tabs, gatherings, places
 */
export class TownPage extends BasePage {
  readonly marketTab: Locator
  readonly gatheringTab: Locator
  readonly placeCards: Locator
  readonly reviewBottomSheet: Locator

  constructor(page: Page) {
    super(page)
    this.marketTab = page.getByRole('button', { name: /장터/ })
    this.gatheringTab = page.getByRole('button', { name: /소모임/ })
    this.placeCards = page.locator('.bg-white.rounded-xl.border')
    this.reviewBottomSheet = page.locator('.animate-slideUp')
  }

  async goto() {
    await super.goto('/town')
    await this.waitForLoadingComplete()
  }

  async switchToMarket() {
    await this.marketTab.click()
  }

  async switchToGathering() {
    await this.gatheringTab.click()
  }

  async getPlaceCardCount(): Promise<number> {
    return this.placeCards.count()
  }

  async clickReviewButton(placeIndex = 0) {
    const card = this.placeCards.nth(placeIndex)
    const reviewBtn = card.getByTitle('리뷰')
    await reviewBtn.click()
  }

  async isReviewSheetVisible(): Promise<boolean> {
    return this.reviewBottomSheet.isVisible()
  }

  async closeReviewSheet() {
    await this.page.locator('.bg-black\\/40').click()
  }
}

/**
 * Gathering Detail Page Object — /town/gathering/[id]
 * Group detail: info tab, board tab, emoji reactions
 */
export class GatheringPage extends BasePage {
  readonly boardTab: Locator
  readonly infoTab: Locator
  readonly joinButton: Locator
  readonly leaveButton: Locator
  readonly postInput: Locator
  readonly postSubmitButton: Locator
  readonly posts: Locator
  readonly emojiButtons: Locator
  readonly memberList: Locator
  readonly leaveConfirmDialog: Locator

  constructor(page: Page) {
    super(page)
    this.boardTab = page.getByRole('button', { name: '게시판', exact: true })
    this.infoTab = page.getByRole('button', { name: '정보', exact: true })
    this.joinButton = page.getByRole('button', { name: '소모임 참여하기' })
    this.leaveButton = page.getByRole('button', { name: '소모임 나가기' })
    this.postInput = page.getByPlaceholder(/글을 작성/)
    this.postSubmitButton = page.getByRole('button', { name: '게시' })
    this.posts = page.locator('.bg-white.rounded-2xl.border').filter({ has: page.locator('.whitespace-pre-wrap') })
    this.emojiButtons = page.locator('button').filter({ has: page.locator('.leading-none') })
    this.memberList = page.getByText(/멤버 \d+명/).locator('..')
    this.leaveConfirmDialog = page.locator('.bg-orange-50')
  }

  async goto(id: string) {
    await super.goto(`/town/gathering/${id}`)
    await this.waitForLoadingComplete()
  }

  async switchToBoard() {
    if (await this.boardTab.isVisible()) {
      await this.boardTab.click()
    }
  }

  async switchToInfo() {
    await this.infoTab.click()
  }

  async isInfoTabActive(): Promise<boolean> {
    const cls = await this.infoTab.getAttribute('class')
    return cls?.includes('color-primary') || false
  }

  async isBoardTabActive(): Promise<boolean> {
    if (!await this.boardTab.isVisible()) return false
    const cls = await this.boardTab.getAttribute('class')
    return cls?.includes('color-primary') || false
  }

  async getPostCount(): Promise<number> {
    return this.posts.count()
  }

  async isMemberListVisible(): Promise<boolean> {
    return this.memberList.isVisible()
  }

  async isLeaveButtonSmall(): Promise<boolean> {
    if (!await this.leaveButton.isVisible()) return false
    const cls = await this.leaveButton.getAttribute('class')
    return cls?.includes('text-[12px]') || cls?.includes('underline') || false
  }

  async getTabCount(): Promise<number> {
    // Count tabs in the sticky tab bar
    const tabBar = this.page.locator('.sticky .flex button')
    return tabBar.count()
  }
}
