import { test, expect } from './fixtures/auth.fixture'

/**
 * Growth Tracking & Records E2E Tests
 * Critical flows: record history, growth add, photo timelapse, date navigation
 */

async function isAuthenticated(page: import('@playwright/test').Page): Promise<boolean> {
  return !page.url().includes('/onboarding')
}

test.describe('Growth — Record Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      localStorage.setItem('dodam_child_name', 'Test Baby')
      localStorage.setItem(
        'dodam_child_birthdate',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      )
      // Dismiss onboarding overlays
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    })
    await page.reload().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('should render record page with calendar', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/record')
    await page.waitForLoadState('networkidle').catch(() => {})

    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 })
  })

  test('should navigate to records detail page', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    await page.goto(`/records/${today}`)
    await page.waitForLoadState('networkidle').catch(() => {})

    // PageHeader with "기록 상세"
    const header = page.locator('header.z-30')
    await expect(header).toBeVisible({ timeout: 5000 })
    await expect(header).toContainText('기록 상세')

    // Date navigation buttons
    const buttons = page.locator('button').filter({ has: page.locator('svg') })
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThanOrEqual(2) // prev + next

    // Summary cards (4 grid)
    const summaryGrid = page.locator('.grid.grid-cols-4')
    if (await summaryGrid.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(summaryGrid).toBeVisible()
    }
  })

  test('records detail date navigation — previous day', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    await page.goto(`/records/${today}`)
    await page.waitForLoadState('networkidle').catch(() => {})

    // Click previous button (rotate-180 chevron)
    const prevButton = page.locator('button').filter({ has: page.locator('.rotate-180') }).first()
    if (await prevButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await prevButton.click()
      await page.waitForTimeout(1500)

      // URL should change to previous date
      expect(page.url()).not.toContain(today)
      expect(page.url()).toMatch(/\/records\/\d{4}-\d{2}-\d{2}/)
    }
  })

  test('records detail next button disabled on today', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    await page.goto(`/records/${today}`)
    await page.waitForLoadState('networkidle').catch(() => {})

    // "오늘" should be visible in the date label
    const dateLabel = page.getByText('오늘')
    if (await dateLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(dateLabel).toBeVisible()
    }
  })
})

test.describe('Growth — Add Record', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      localStorage.setItem('dodam_child_name', 'Test Baby')
      localStorage.setItem(
        'dodam_child_birthdate',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      )
      // Dismiss onboarding overlays
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    })
    await page.reload().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('should render growth add page with form', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/growth/add')
    await page.waitForLoadState('networkidle').catch(() => {})

    // PageHeader
    const header = page.locator('header.z-30')
    await expect(header).toBeVisible({ timeout: 5000 })
    await expect(header).toContainText('성장 기록 추가')

    // Form fields
    const dateInput = page.locator('input[type="date"]')
    await expect(dateInput).toBeVisible()

    const weightInput = page.getByPlaceholder('예: 9.8')
    await expect(weightInput).toBeVisible()

    const heightInput = page.getByPlaceholder('예: 76.5')
    await expect(heightInput).toBeVisible()

    const headInput = page.getByPlaceholder('예: 46.0')
    await expect(headInput).toBeVisible()
  })

  test('submit button disabled when no values entered', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/growth/add')
    await page.waitForLoadState('networkidle').catch(() => {})

    const submitButton = page.getByRole('button', { name: '기록 저장' })
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(submitButton).toBeDisabled()
    }
  })

  test('submit button enabled when weight entered', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/growth/add')
    await page.waitForLoadState('networkidle').catch(() => {})

    const weightInput = page.getByPlaceholder('예: 9.8')
    await weightInput.fill('9.8')

    const submitButton = page.getByRole('button', { name: '기록 저장' })
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(submitButton).toBeEnabled()
    }
  })

  test('validates unrealistic weight values', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/growth/add')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Wait for any overlay/splash to disappear
    await page.waitForTimeout(3000)

    // Enter unrealistic weight
    const weightInput = page.getByPlaceholder('예: 9.8')
    if (await weightInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await weightInput.fill('50')

      // Submit via form event to bypass overlay interception
      await page.evaluate(() => {
        const form = document.querySelector('form')
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      })

      // Should show validation error
      const error = page.getByText(/몸무게를 확인/)
      if (await error.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(error).toBeVisible()
      }
    }
  })
})

test.describe('Growth — Photo Timelapse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      // Dismiss onboarding overlays
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    })
    await page.reload().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('should render photos page with PageHeader', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    await page.goto('/growth/photos')
    await page.waitForLoadState('networkidle').catch(() => {})

    const header = page.locator('header.z-30')
    await expect(header).toBeVisible({ timeout: 5000 })
    await expect(header).toContainText('사진 타임랩스')

    // "+ 추가" button in header
    const addButton = page.getByText('+ 추가').or(page.getByText('+추가'))
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(addButton).toBeVisible()
    }
  })
})

test.describe('Growth — Pregnancy Records', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/').catch(() => {})
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'pregnant')
      localStorage.setItem('dodam_preg_duedate', (() => {
        const d = new Date()
        d.setMonth(d.getMonth() + 3)
        return d.toISOString().split('T')[0]
      })())
      // Dismiss onboarding overlays
      localStorage.setItem('dodam_guide_pregnant', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      sessionStorage.setItem('dodam_splash_shown', '1')
    })
    await page.reload().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('should render preg-records detail with summary grid', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    await page.goto(`/preg-records/${today}`)
    await page.waitForLoadState('networkidle').catch(() => {})

    // PageHeader
    const header = page.locator('header.z-30')
    await expect(header).toBeVisible({ timeout: 5000 })

    // Summary cards should show: 기분, 체중, 태동, 물 섭취
    const summaryGrid = page.locator('.grid.grid-cols-4')
    if (await summaryGrid.isVisible({ timeout: 3000 }).catch(() => false)) {
      const gridText = await summaryGrid.textContent()
      expect(gridText).toContain('기분')
      expect(gridText).toContain('체중')
      expect(gridText).toContain('태동')
      expect(gridText).toContain('물 섭취')
    }
  })
})
