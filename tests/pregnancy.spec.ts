import { test, expect } from './fixtures/auth.fixture'

/**
 * Pregnancy Mode E2E Tests
 * Critical flows: pregnancy tracking, fetal development, health records
 */
test.describe('Pregnancy Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated pregnant mode
    await page.goto('/pregnant')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'pregnant')
      // Set expected date 200 days from now (approx 28 weeks pregnant)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 200)
      localStorage.setItem('dodam_preg_duedate', dueDate.toISOString().split('T')[0])
    })
    await page.reload()
  })

  test('should display pregnancy page with D-day and week info', async ({ pregnantPage }) => {
    await pregnantPage.goto()

    // D-day visible
    await expect(pregnantPage.dDayBadge).toBeVisible()

    // Week info visible
    await expect(pregnantPage.weekInfo).toBeVisible()

    // Fetal development card visible
    await expect(pregnantPage.fetalDevCard).toBeVisible()
  })

  test('should calculate pregnancy week correctly', async ({ pregnantPage }) => {
    await pregnantPage.goto()

    const week = await pregnantPage.getCurrentWeek()

    // Should be around 11-12 weeks (280 - 200 days = 80 days = ~11 weeks)
    expect(week).toBeGreaterThan(10)
    expect(week).toBeLessThan(15)
  })

  test('should display correct D-day countdown', async ({ pregnantPage }) => {
    await pregnantPage.goto()

    const dDay = await pregnantPage.getDDay()

    // Should be around 200 days
    expect(dDay).toBeGreaterThan(190)
    expect(dDay).toBeLessThan(210)
  })

  test('should record mood', async ({ pregnantPage, page }) => {
    await pregnantPage.goto()

    await pregnantPage.recordMood('happy')

    // Toast confirmation
    await expect(page.getByRole('alert')).toContainText(/기분|행복/)
  })

  test('should record fetal movement', async ({ pregnantPage, page }) => {
    await pregnantPage.goto()

    await pregnantPage.recordFetalMovement()

    await expect(page.getByRole('alert')).toContainText(/태동/)
  })

  test('should record supplement intake', async ({ pregnantPage, page }) => {
    await pregnantPage.goto()

    await pregnantPage.recordSupplement('folic')

    await expect(page.getByRole('alert')).toContainText(/엽산/)
  })

  test('should navigate to diary', async ({ pregnantPage }) => {
    await pregnantPage.goto()

    await pregnantPage.goToDiary()

    await expect(pregnantPage.page).toHaveURL(/\/preg-diary/)
  })

  test('should navigate to checkup records', async ({ pregnantPage }) => {
    await pregnantPage.goto()

    await pregnantPage.goToCheckup()

    await expect(pregnantPage.page).toHaveURL(/\/preg-records/)
  })

  test('should display weekly fetal development information', async ({ page }) => {
    await page.goto('/pregnant')

    // Fetal development card should show size/weight info
    const devCard = page.locator('text=/태아 발달/').locator('..')
    await expect(devCard).toBeVisible()

    // Should contain development milestones
    await expect(devCard).toContainText(/주/)
  })

  test('should track weight gain', async ({ page }) => {
    await page.goto('/pregnant')

    // Record weight via FAB or quick button
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'preg_weight', tags: { weight_kg: 58.5 } }
      }))
    })

    await expect(page.getByRole('alert')).toContainText(/체중/)
  })

  test('should show checkup schedule', async ({ page }) => {
    await page.goto('/pregnant')

    // Navigate to checkup page
    await page.getByRole('link', { name: /검진/ }).click()

    // Should display checkup schedule based on pregnancy week
    await expect(page).toHaveURL(/\/preg-records/)
    await expect(page.getByText(/주차/)).toBeVisible()
  })

  test('should calculate and display expected baby info', async ({ page }) => {
    await page.goto('/pregnant')

    // Should show fetal development milestones
    const milestones = page.getByText(/발달|성장/)
    await expect(milestones).toBeVisible()
  })
})

test.describe('Preparing Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preparing')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'preparing')
    })
    await page.reload()
  })

  test('should display preparing page', async ({ page }) => {
    await page.goto('/preparing')

    // Should show preparing mode content
    await expect(page.getByText(/임신 준비|배란/)).toBeVisible()
  })

  test('should record ovulation tracking', async ({ page }) => {
    await page.goto('/preparing')

    // Navigate to ovulation page
    await page.getByRole('link', { name: /배란|가임기/ }).click()

    await expect(page).toHaveURL(/\/ovulation/)
  })

  test('should record health metrics for preparing', async ({ page }) => {
    await page.goto('/preparing')

    // Record supplement intake
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'prep_folic' }
      }))
    })

    await expect(page.getByRole('alert')).toContainText(/엽산/)
  })

  test('should display fertility calendar', async ({ page }) => {
    await page.goto('/ovulation')

    // Calendar should be visible
    await expect(page.locator('text=/배란일|가임기/')).toBeVisible()
  })
})
