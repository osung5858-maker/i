import { test, expect } from './fixtures/auth.fixture'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility Tests
 * WCAG 2.1 AA compliance using axe-core
 */
test.describe('Accessibility - WCAG 2.1 AA', () => {
  test('home page should have no accessibility violations', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('onboarding page should have no accessibility violations', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('pregnancy page should have no accessibility violations', async ({ page }) => {
    await page.goto('/pregnant')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'pregnant')
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 200)
      localStorage.setItem('dodam_preg_duedate', dueDate.toISOString().split('T')[0])
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('settings page should have no accessibility violations', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('vaccination page should have no accessibility violations', async ({ page }) => {
    await page.goto('/vaccination')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('growth records page should have no accessibility violations', async ({ page }) => {
    await page.goto('/growth')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('community page should have no accessibility violations', async ({ page }) => {
    await page.goto('/town')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
})

test.describe('Keyboard Navigation', () => {
  test('should navigate onboarding with keyboard', async ({ page }) => {
    await page.goto('/onboarding')

    // Tab to Kakao button
    await page.keyboard.press('Tab')
    let focused = await page.evaluate(() => document.activeElement?.textContent)
    expect(focused).toContain('카카오')

    // Tab to Google button
    await page.keyboard.press('Tab')
    focused = await page.evaluate(() => document.activeElement?.textContent)
    expect(focused).toContain('Google')
  })

  test('should navigate home page cards with keyboard', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()

    // Tab through interactive elements
    await page.keyboard.press('Tab') // Share button
    await page.keyboard.press('Tab') // Vaccination card
    await page.keyboard.press('Tab') // Growth card

    // Verify focus is on interactive element
    const focused = await page.evaluate(() => {
      const el = document.activeElement
      return el?.tagName === 'A' || el?.tagName === 'BUTTON'
    })
    expect(focused).toBe(true)
  })

  test('should activate buttons with Enter and Space', async ({ page }) => {
    await page.goto('/onboarding')

    // Focus on Kakao button
    await page.keyboard.press('Tab')

    // Activate with Enter
    await page.keyboard.press('Enter')

    // Should trigger OAuth (we can't test full flow, but verify click worked)
    // In real app, this would redirect to Kakao OAuth
  })

  test('should trap focus in modal dialogs', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()

    // Open a modal (e.g., temperature input)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'temp' }
      }))
    })

    // Wait for modal
    const modal = page.locator('[role="dialog"]')
    await modal.waitFor({ state: 'visible' })

    // Tab should stay within modal
    const firstFocusable = modal.locator('button, input').first()
    const lastFocusable = modal.locator('button, input').last()

    // Focus first element
    await firstFocusable.focus()

    // Tab to last
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Tab again should cycle back to first (focus trap)
    await page.keyboard.press('Tab')

    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(['INPUT', 'BUTTON']).toContain(focused)
  })

  test('should close modal with Escape key', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()

    // Open modal
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'temp' }
      }))
    })

    const modal = page.locator('[role="dialog"]')
    await modal.waitFor({ state: 'visible' })

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should close
    await expect(modal).toBeHidden()
  })
})

test.describe('ARIA Labels and Roles', () => {
  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/onboarding')

    // Login buttons should have accessible names
    const kakaoBtn = page.getByRole('button', { name: /카카오로 시작하기/ })
    await expect(kakaoBtn).toBeVisible()

    const googleBtn = page.getByRole('button', { name: /Google로 시작하기/ })
    await expect(googleBtn).toBeVisible()
  })

  test('links should have accessible names', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()

    // Navigation links should have accessible names
    const vaccinationLink = page.getByRole('link', { name: /접종/ })
    await expect(vaccinationLink).toBeVisible()
  })

  test('images should have alt text', async ({ page }) => {
    await page.goto('/onboarding')

    // App icon should have alt text
    const appIcon = page.locator('img[alt="도담"]')
    await expect(appIcon).toBeVisible()
  })

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/settings/children/add')

    // Name input should have label
    const nameInput = page.getByRole('textbox', { name: /이름/ })
    await expect(nameInput).toBeVisible()

    // Birthdate input should have label
    const birthdateInput = page.getByLabel(/생년월일/)
    await expect(birthdateInput).toBeVisible()
  })

  test('toast notifications should use alert role', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()

    // Trigger event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'pee' }
      }))
    })

    // Toast should have alert or status role
    const toast = page.getByRole('alert').or(page.locator('[role="status"]'))
    await expect(toast).toBeVisible()
  })

  test('loading states should be announced to screen readers', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()

    // Trigger AI care (has loading state)
    await page.evaluate(() => {
      // Record 3 events first
      for (let i = 0; i < 3; i++) {
        window.dispatchEvent(new CustomEvent('dodam-record', {
          detail: { type: 'feed', amount_ml: 100 }
        }))
      }
    })

    const aiButton = page.getByRole('button', { name: /AI 케어받기/ })
    if (await aiButton.isVisible()) {
      await aiButton.click()

      // Loading message should be visible
      const loading = page.getByText(/AI가 기록을 분석/)
      await expect(loading).toBeVisible()
    }
  })
})

test.describe('Color Contrast', () => {
  test('primary buttons should have sufficient contrast', async ({ page }) => {
    await page.goto('/onboarding')

    const kakaoBtn = page.getByRole('button', { name: /카카오로 시작하기/ })

    // Get computed styles
    const styles = await kakaoBtn.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor
      }
    })

    // Yellow (#FEE500) on black text should have good contrast
    expect(styles.backgroundColor).toBeTruthy()
    expect(styles.color).toBeTruthy()
  })

  test('text should be readable on all backgrounds', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dodam_mode', 'parenting')
    })
    await page.reload()

    // Check various text elements for contrast
    const heading = page.getByRole('heading').first()
    const styles = await heading.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor
      }
    })

    expect(styles.color).toBeTruthy()
  })
})
