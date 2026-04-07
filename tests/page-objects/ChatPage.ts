import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Chat List Page Object — /chat
 * Market chat listing with unread/read sections
 */
export class ChatListPage extends BasePage {
  readonly emptyState: Locator
  readonly goToMarketButton: Locator
  readonly unreadSection: Locator
  readonly readSection: Locator
  readonly chatItems: Locator

  constructor(page: Page) {
    super(page)
    this.emptyState = page.getByText('거래 채팅이 없어요')
    this.goToMarketButton = page.getByRole('button', { name: '도담장터 가기' })
    this.unreadSection = page.getByText('읽지 않은 대화').locator('..')
    this.readSection = page.getByText('이전 대화').locator('..')
    this.chatItems = page.locator('button').filter({ has: page.locator('.truncate') })
  }

  async goto() {
    await super.goto('/chat')
    await this.waitForLoadingComplete()
  }

  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible()
  }

  async getChatCount(): Promise<number> {
    return this.chatItems.count()
  }

  async clickFirstChat() {
    const first = this.chatItems.first()
    await first.waitFor({ state: 'visible' })
    await first.click()
  }

  async hasUnreadDot(): Promise<boolean> {
    return this.page.locator('.bg-\\[var\\(--color-primary\\)\\].rounded-full.w-2.h-2').first().isVisible()
  }
}

/**
 * Chat Room Page Object — /chat/[chatId]
 * 1:1 marketplace transaction chat
 */
export class ChatRoomPage extends BasePage {
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly messageList: Locator
  readonly emptyState: Locator
  readonly itemMiniCard: Locator
  readonly reserveButton: Locator
  readonly completeButton: Locator

  constructor(page: Page) {
    super(page)
    this.messageInput = page.getByPlaceholder('메시지를 입력하세요...')
    this.sendButton = page.locator('button').filter({ has: page.locator('svg polygon') })
    this.messageList = page.locator('.px-4.py-4')
    this.emptyState = page.getByText('첫 메시지를 보내보세요!')
    this.itemMiniCard = page.locator('.bg-\\[\\#F8F6F3\\]')
    this.reserveButton = page.getByRole('button', { name: '예약중' })
    this.completeButton = page.getByRole('button', { name: '완료' })
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text)
    await this.sendButton.click()
  }

  async getMessageCount(): Promise<number> {
    return this.page.locator('.rounded-2xl.px-3.py-2').count()
  }

  async getLastMessageText(): Promise<string> {
    const msgs = this.page.locator('.rounded-2xl.px-3.py-2')
    const count = await msgs.count()
    if (count === 0) return ''
    return (await msgs.nth(count - 1).textContent()) || ''
  }

  async isItemMiniCardVisible(): Promise<boolean> {
    return this.itemMiniCard.isVisible()
  }

  async canReserve(): Promise<boolean> {
    return this.reserveButton.isVisible().catch(() => false)
  }

  async canComplete(): Promise<boolean> {
    return this.completeButton.isVisible().catch(() => false)
  }
}
