import { test, expect } from './fixtures/auth.fixture'

/**
 * Parenting Mode E2E Tests
 * Critical user flows: record events, view history, AI care, offline mode
 *
 * ALL tests require authenticated access to the home page (/).
 * Without real Supabase auth, the app redirects to /onboarding and
 * none of these features are accessible. Tests skip gracefully.
 */

/** Auth guard: returns true if the home page loaded (not redirected to /onboarding). */
async function isAuthenticated(page: import('@playwright/test').Page): Promise<boolean> {
  const url = page.url()
  return !url.includes('/onboarding')
}

test.describe('Parenting Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Set parenting mode in localStorage, then navigate to /
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
      localStorage.setItem('dodam_child_name', 'Test Baby')
      localStorage.setItem(
        'dodam_child_birthdate',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      )
    })
    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('should display home page with AI care card', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // AI Care card visible
    await expect(homePage.aiCareCard).toBeVisible()

    // Share button visible
    await expect(homePage.shareButton).toBeVisible()

    // Today's record section visible
    await expect(homePage.todayRecordSection).toBeVisible()
  })

  test('should record feeding event', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // Trigger feed event via custom event
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('dodam-record', {
          detail: { type: 'feed', amount_ml: 120 },
        }),
      )
    })

    // Wait for toast
    await expect(page.getByRole('alert')).toContainText(/분유.*120ml/)

    // Event count should increase
    const count = await homePage.getTodayEventCount()
    expect(count).toBeGreaterThan(0)
  })

  test('should record sleep event', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // Start sleep
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('dodam-record', {
          detail: { type: 'sleep' },
        }),
      )
    })

    // Toast should confirm
    await expect(page.getByRole('alert')).toContainText(/수면 시작/)
  })

  test('should record poop event with status', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // Record poop with status
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('dodam-record', {
          detail: { type: 'poop', tags: { status: 'normal' } },
        }),
      )
    })

    await expect(page.getByRole('alert')).toContainText(/대변/)
  })

  test('should record temperature and trigger care flow for fever', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // Record high temperature
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('dodam-record', {
          detail: { type: 'temp', tags: { celsius: 38.5 } },
        }),
      )
    })

    // Should show warning toast
    await expect(page.getByRole('alert')).toContainText(/38.5.*주의/i)
  })

  test('should undo last event', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // Record an event
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('dodam-record', {
          detail: { type: 'pee' },
        }),
      )
    })

    // Wait for toast with undo button
    await expect(page.getByRole('alert')).toBeVisible()

    // Click undo
    await homePage.undoLastEvent()

    // Event should be removed (count unchanged or decreased)
  })

  test('should request AI care analysis after 3+ events', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // Record 3 events
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent('dodam-record', {
            detail: { type: 'feed', amount_ml: 100 },
          }),
        )
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
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // Mock Kakao SDK
    await page.evaluate(() => {
      ;(window as any).Kakao = {
        isInitialized: () => true,
        Share: {
          sendDefault: () => console.log('Kakao share called'),
        },
      }
    })

    // Click share button
    await homePage.shareButton.click()
  })

  test('should navigate to vaccination page', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    await homePage.goToVaccination()

    // Should be on vaccination page
    await expect(homePage.page).toHaveURL(/\/vaccination/)
  })

  test('should navigate to growth records', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    await homePage.goToGrowth()

    await expect(homePage.page).toHaveURL(/\/record/)
  })

  test('should display offline mode banner when offline', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // Go offline
    await page.context().setOffline(true)

    // Reload to trigger offline detection
    await page.reload().catch(() => {})

    // Offline banner should appear
    await expect(page.getByText(/오프라인/)).toBeVisible({ timeout: 5000 })
  })

  test('should queue events when offline and sync when online', async ({ homePage, page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await homePage.goto()

    // Go offline
    await page.context().setOffline(true)

    // Record event
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('dodam-record', {
          detail: { type: 'pee' },
        }),
      )
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
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

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
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    await page.goto('/')

    // Simulate shake event (devicemotion)
    await page.evaluate(() => {
      const event = new DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: {
          x: 30,
          y: 30,
          z: 30,
        },
      })
      window.dispatchEvent(event)
    })

    // Should navigate to emergency page
    await expect(page).toHaveURL(/\/emergency/, { timeout: 2000 })
  })
})

test.describe('Parenting Mode - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('should display bottom navigation with all tabs', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    // Home tab — use the actual tab label from navigation.spec.ts
    const homeLink = page.getByRole('link', { name: /홈|오늘/ })
    await expect(homeLink.first()).toBeVisible()

    // Record tab
    const recordLink = page.getByRole('link', { name: /기록|추억/ })
    await expect(recordLink.first()).toBeVisible()

    // Community tab
    const townLink = page.getByRole('link', { name: /타운|커뮤니티|동네/ })
    await expect(townLink.first()).toBeVisible()

    // More tab
    const moreLink = page.getByRole('link', { name: /더보기|우리/ })
    await expect(moreLink.first()).toBeVisible()
  })

  test('should navigate between tabs', async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, 'Auth not available — redirected to /onboarding')
      return
    }

    // Navigate to record page
    const recordLink = page.getByRole('link', { name: /기록|추억/ }).first()
    await recordLink.click()
    await expect(page).toHaveURL(/\/record/, { timeout: 10000 })

    // Navigate to community
    const townLink = page.getByRole('link', { name: /타운|동네/ }).first()
    await townLink.click()
    await expect(page).toHaveURL(/\/town/, { timeout: 10000 })

    // Back to home
    const homeLink = page.getByRole('link', { name: /홈|오늘/ }).first()
    await homeLink.click()
    await expect(page).toHaveURL(/^\/$/, { timeout: 10000 })
  })
})
