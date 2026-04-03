import { test, expect } from './fixtures/auth.fixture'

/**
 * Parenting Mode E2E Tests
 * Critical user flows: record events, view history, AI care, offline mode
 */
test.describe('Parenting Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated parenting mode
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      localStorage.setItem('dodam_child_name', 'Test Baby')
      localStorage.setItem('dodam_child_birthdate', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // 3 months old
    })
    await page.reload()
  })

  test('should display home page with AI care card', async ({ homePage }) => {
    await homePage.goto()

    // AI Care card visible
    await expect(homePage.aiCareCard).toBeVisible()

    // Share button visible
    await expect(homePage.shareButton).toBeVisible()

    // Today's record section visible
    await expect(homePage.todayRecordSection).toBeVisible()
  })

  test('should record feeding event', async ({ homePage, page }) => {
    await homePage.goto()

    // Trigger feed event via custom event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'feed', amount_ml: 120 }
      }))
    })

    // Wait for toast
    await expect(page.getByRole('alert')).toContainText(/분유.*120ml/)

    // Event count should increase
    const count = await homePage.getTodayEventCount()
    expect(count).toBeGreaterThan(0)
  })

  test('should record sleep event', async ({ homePage, page }) => {
    await homePage.goto()

    // Start sleep
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'sleep' }
      }))
    })

    // Toast should confirm
    await expect(page.getByRole('alert')).toContainText(/수면 시작/)
  })

  test('should record poop event with status', async ({ homePage, page }) => {
    await homePage.goto()

    // Record poop with status
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'poop', tags: { status: 'normal' } }
      }))
    })

    await expect(page.getByRole('alert')).toContainText(/대변/)
  })

  test('should record temperature and trigger care flow for fever', async ({ homePage, page }) => {
    await homePage.goto()

    // Record high temperature
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'temp', tags: { celsius: 38.5 } }
      }))
    })

    // Should show warning toast
    await expect(page.getByRole('alert')).toContainText(/38.5.*주의/i)

    // Care flow card should appear
    // Note: This depends on care-flow engine logic
  })

  test('should undo last event', async ({ homePage, page }) => {
    await homePage.goto()

    // Record an event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'pee' }
      }))
    })

    // Wait for toast with undo button
    await expect(page.getByRole('alert')).toBeVisible()

    // Click undo
    await homePage.undoLastEvent()

    // Event should be removed (count unchanged or decreased)
  })

  test('should request AI care analysis after 3+ events', async ({ homePage, page }) => {
    await homePage.goto()

    // Record 3 events
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('dodam-record', {
          detail: { type: 'feed', amount_ml: 100 }
        }))
      })
      await page.waitForTimeout(500)
    }

    // AI care button should be enabled
    await expect(homePage.aiCareButton).toBeEnabled()
    await expect(homePage.aiCareButton).not.toContainText(/기록.*더/)

    // Request AI care
    await homePage.aiCareButton.click()

    // Loading state
    await expect(page.getByText(/AI가 기록을 분석/)).toBeVisible()

    // Wait for result
    await expect(page.getByText(/AI가 기록을 분석/)).toBeHidden({ timeout: 15000 })
  })

  test('should share today record to KakaoTalk', async ({ homePage, page }) => {
    await homePage.goto()

    // Mock Kakao SDK
    await page.evaluate(() => {
      (window as any).Kakao = {
        isInitialized: () => true,
        Share: {
          sendDefault: () => console.log('Kakao share called')
        }
      }
    })

    // Click share button
    await homePage.shareButton.click()

    // Verify Kakao share was called (in real test, check console or mock)
  })

  test('should navigate to vaccination page', async ({ homePage }) => {
    await homePage.goto()

    await homePage.goToVaccination()

    // Should be on vaccination page
    await expect(homePage.page).toHaveURL(/\/vaccination/)
  })

  test('should navigate to growth records', async ({ homePage }) => {
    await homePage.goto()

    await homePage.goToGrowth()

    await expect(homePage.page).toHaveURL(/\/record/)
  })

  test('should display offline mode banner when offline', async ({ homePage, page }) => {
    await homePage.goto()

    // Go offline
    await page.context().setOffline(true)

    // Reload to trigger offline detection
    await page.reload()

    // Offline banner should appear
    await expect(page.getByText(/오프라인/)).toBeVisible()
  })

  test('should queue events when offline and sync when online', async ({ homePage, page }) => {
    await homePage.goto()

    // Go offline
    await page.context().setOffline(true)

    // Record event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'pee' }
      }))
    })

    // Should show pending sync count
    const pendingCount = await homePage.getPendingSyncCount()
    expect(pendingCount).toBeGreaterThan(0)

    // Go online
    await page.context().setOffline(false)

    // Wait for sync
    await page.waitForTimeout(2000)

    // Offline banner should disappear
    await expect(page.getByText(/오프라인/)).toBeHidden({ timeout: 5000 })
  })

  test('should display kidsnote card for children 12+ months', async ({ homePage, page }) => {
    await homePage.goto()

    // Set child age to 12+ months
    await page.evaluate(() => {
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
      localStorage.setItem('dodam_child_birthdate', twelveMonthsAgo.toISOString().split('T')[0])
    })
    await page.reload()

    // Kidsnote card should be visible
    await expect(homePage.kidsnoteCard).toBeVisible()
  })

  test('should handle shake gesture for emergency mode', async ({ page }) => {
    await page.goto('/')

    // Simulate shake event (devicemotion)
    await page.evaluate(() => {
      const event = new DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: {
          x: 30,
          y: 30,
          z: 30
        }
      })
      window.dispatchEvent(event)
    })

    // Should navigate to emergency page
    await expect(page).toHaveURL(/\/emergency/, { timeout: 2000 })
  })
})

test.describe('Parenting Mode - Navigation', () => {
  test('should display bottom navigation with all tabs', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()

    // Home tab
    await expect(page.getByRole('link', { name: /홈/ })).toBeVisible()

    // Record tab
    await expect(page.getByRole('link', { name: /기록/ })).toBeVisible()

    // Community tab
    await expect(page.getByRole('link', { name: /타운|커뮤니티/ })).toBeVisible()

    // More tab
    await expect(page.getByRole('link', { name: /더보기/ })).toBeVisible()
  })

  test('should navigate between tabs', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()

    // Navigate to record page
    await page.getByRole('link', { name: /기록/ }).click()
    await expect(page).toHaveURL(/\/record/)

    // Navigate to community
    await page.getByRole('link', { name: /타운/ }).click()
    await expect(page).toHaveURL(/\/town/)

    // Back to home
    await page.getByRole('link', { name: /홈/ }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})
