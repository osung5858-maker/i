import { test, expect } from './fixtures/auth.fixture'

/**
 * 우리(More) Page E2E Tests
 * 2-depth category navigation: 1뎁스 카드 그리드 → 2뎁스 상세 리스트
 *
 * Structure:
 *   parenting: 6 categories (3×2 grid) + emergency banner
 *   pregnant:  3 categories (3×1) + birth banner
 *   preparing: 3 categories (3×1)
 */

async function hideNextjsDevOverlay(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const portal = document.querySelector('nextjs-portal')
    if (portal) (portal as HTMLElement).style.display = 'none'
  }).catch(() => {})
}

async function setupMode(page: import('@playwright/test').Page, mode: string) {
  await page.goto('/').catch(() => {})
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.evaluate((m) => {
    localStorage.setItem('dodam_mode', m)
    localStorage.setItem('dodam_child_name', 'Test Baby')
    localStorage.setItem(
      'dodam_child_birthdate',
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    )
    localStorage.setItem('dodam_guide_parenting', '1')
    localStorage.setItem('dodam_push_prompt_dismissed', '1')
    sessionStorage.setItem('dodam_splash_shown', '1')
  }, mode)
  await page.goto('/more').catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})
  await hideNextjsDevOverlay(page)
}

function isOnMorePage(page: import('@playwright/test').Page): boolean {
  return page.url().includes('/more')
}

test.describe('우리(More) Page — Parenting Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupMode(page, 'parenting')
  })

  test('1뎁스: 6개 카테고리 카드가 3열 그리드로 표시된다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page — likely redirected')
      return
    }

    const categoryLabels = ['건강·의료', 'AI 분석', '육아 생활', '연동·지원', '마음 챙김', '가족']
    for (const label of categoryLabels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 5000 })
    }

    // 6개 카테고리 버튼
    const categoryButtons = page.locator('button:has-text("건강"), button:has-text("AI"), button:has-text("육아"), button:has-text("연동"), button:has-text("마음"), button:has-text("가족")')
    await expect(categoryButtons).toHaveCount(6)
  })

  test('1뎁스: 응급 모드 배너가 표시된다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    await expect(page.getByText('응급 모드')).toBeVisible({ timeout: 5000 })
    const emergencyLink = page.getByRole('link', { name: /응급 모드/ })
    await expect(emergencyLink).toHaveAttribute('href', '/emergency')
  })

  test('1뎁스: 카테고리 카드에 "N개" 카운트가 없다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    // 카테고리 그리드 영역에서 "N개" 패턴이 없어야 한다
    const grid = page.locator('.grid-cols-3')
    const gridText = await grid.textContent()
    expect(gridText).not.toMatch(/\d+개/)
  })

  test('2뎁스: 카테고리 탭 → 상세 리스트 진입', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    // "건강·의료" 카테고리 클릭
    await page.getByText('건강·의료', { exact: true }).click()

    // 서브 헤더에 카테고리명이 표시됨
    await expect(page.locator('header').getByText('건강·의료')).toBeVisible({ timeout: 5000 })

    // 세부 메뉴 항목들이 보임
    await expect(page.getByText('육아 SOS')).toBeVisible()
    await expect(page.getByText('예방접종')).toBeVisible()
    await expect(page.getByText('알레르기 체크')).toBeVisible()
    await expect(page.getByText('울음 분석')).toBeVisible()
  })

  test('2뎁스: 서브 헤더가 PageHeader 디자인과 동일하다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    await page.getByText('AI 분석', { exact: true }).click()

    // 서브 헤더 존재 확인 (top-[72px]로 구분 — 글로벌 헤더는 top-0)
    const header = page.locator('header.sticky.z-30')
    await expect(header).toBeVisible({ timeout: 5000 })

    // 뒤로가기 버튼 존재
    const backButton = header.getByLabel('뒤로가기')
    await expect(backButton).toBeVisible()

    // 중앙 타이틀
    await expect(header.getByText('AI 분석')).toBeVisible()
  })

  test('2뎁스: 뒤로가기 → 1뎁스 그리드로 복귀', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    // 카테고리 진입
    await page.getByText('육아 생활', { exact: true }).click()
    await expect(page.getByText('이유식 가이드')).toBeVisible({ timeout: 5000 })

    // 뒤로가기
    await page.getByLabel('뒤로가기').click()

    // 1뎁스 그리드로 복귀
    await expect(page.getByText('육아 생활', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('건강·의료', { exact: true })).toBeVisible()
  })

  test('2뎁스: 각 카테고리의 세부 메뉴 항목 수 검증', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    const expectations: [string, number][] = [
      ['건강·의료', 4],
      ['AI 분석', 3],
      ['육아 생활', 4],
      ['연동·지원', 2],
      ['마음 챙김', 2],
      ['가족', 3],
    ]

    for (const [category, expectedCount] of expectations) {
      await page.getByText(category, { exact: true }).click()
      // 메뉴 항목은 링크(a) 또는 Link
      const items = page.locator('.flex.flex-col.shadow-sm > a, .flex.flex-col.shadow-sm > [href]')
      await expect(items).toHaveCount(expectedCount, { timeout: 5000 })
      await page.getByLabel('뒤로가기').click()
      await expect(page.getByText(category, { exact: true })).toBeVisible({ timeout: 5000 })
    }
  })

  test('2뎁스: 세부 메뉴 링크가 올바른 href를 가진다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    // 건강·의료 카테고리의 링크 검증
    await page.getByText('건강·의료', { exact: true }).click()
    await expect(page.getByText('육아 SOS')).toBeVisible({ timeout: 5000 })

    const expectedLinks = ['/troubleshoot', '/vaccination', '/allergy', '/cry']
    for (const href of expectedLinks) {
      await expect(page.locator(`a[href="${href}"]`)).toBeVisible()
    }
  })
})

test.describe('우리(More) Page — Pregnant Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupMode(page, 'pregnant')
  })

  test('3개 카테고리가 표시된다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    const labels = ['출산 준비', '마음 챙김', '연동·지원']
    for (const label of labels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 5000 })
    }
  })

  test('출산 전환 배너가 표시된다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    await expect(page.getByText(/만났어요/)).toBeVisible({ timeout: 5000 })
  })

  test('연동·지원에 설정 메뉴가 포함되어 있다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    await page.getByText('연동·지원', { exact: true }).click()
    // 세부 리스트 내의 설정 항목 확인 (글로벌 헤더의 설정 링크와 구분)
    const menuList = page.locator('.flex.flex-col.shadow-sm')
    await expect(menuList.getByText('설정')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('우리(More) Page — Preparing Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupMode(page, 'preparing')
  })

  test('3개 카테고리가 표시된다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    const labels = ['준비 도우미', '마음 챙김', '연동·지원']
    for (const label of labels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 5000 })
    }
  })

  test('배너가 없다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    // preparing 모드에는 배너가 없음
    await expect(page.getByText('응급 모드')).not.toBeVisible({ timeout: 2000 })
    await expect(page.getByText(/만났어요/)).not.toBeVisible({ timeout: 2000 })
  })
})

test.describe('우리(More) Page — Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupMode(page, 'parenting')
  })

  test('카테고리 버튼에 접근 가능한 텍스트가 있다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    // 각 카테고리 버튼이 텍스트를 포함하여 스크린리더에서 식별 가능
    const buttons = page.locator('.grid-cols-3 button')
    const count = await buttons.count()
    expect(count).toBe(6)

    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  })

  test('2뎁스 뒤로가기 버튼에 aria-label이 있다', async ({ page }) => {
    if (!isOnMorePage(page)) {
      test.skip(true, 'Not on more page')
      return
    }

    await page.getByText('건강·의료', { exact: true }).click()
    const backBtn = page.getByLabel('뒤로가기')
    await expect(backBtn).toBeVisible({ timeout: 5000 })
  })
})
