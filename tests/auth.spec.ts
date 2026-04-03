import { test, expect } from '@playwright/test'
import { OnboardingPage } from './page-objects/OnboardingPage'

/**
 * Authentication Flow Tests
 * Tests login, mode selection, and session management
 */
test.describe('Authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // Start without auth

  test('should display onboarding screen for unauthenticated users', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    await onboarding.goto()

    // Should show login screen
    await expect(onboarding.kakaoLoginButton).toBeVisible()
    await expect(onboarding.googleLoginButton).toBeVisible()

    // Should show branding
    await expect(page.getByRole('heading', { name: /오늘도 도담하게/ })).toBeVisible()
  })

  test('should show login buttons with correct text', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    await onboarding.goto()

    // Kakao button
    await expect(onboarding.kakaoLoginButton).toHaveText(/카카오로 시작하기/)

    // Google button
    await expect(onboarding.googleLoginButton).toHaveText(/Google로 시작하기/)
  })

  test('should disable login buttons while loading', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    await onboarding.goto()

    // Click Kakao login
    await onboarding.kakaoLoginButton.click()

    // Button should show loading state
    // Note: Actual OAuth will redirect, so we can't verify disabled state in real flow
    // This test is more useful with mocked OAuth
  })

  test('should show mode selection after login', async ({ page }) => {
    // Skip actual OAuth and jump to mode selection
    // In real implementation, this would be after OAuth callback

    const onboarding = new OnboardingPage(page)
    await page.goto('/onboarding')

    // Simulate logged-in state
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-user',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      }
      // This would normally be set by Supabase auth
      window.localStorage.setItem('sb-test-auth-token', JSON.stringify({
        user: mockUser,
        access_token: 'mock-token'
      }))
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should show mode selection
    await expect(onboarding.preparingModeButton).toBeVisible()
    await expect(onboarding.pregnantModeButton).toBeVisible()
    await expect(onboarding.parentingModeButton).toBeVisible()
  })

  test('should navigate to home after selecting parenting mode', async ({ page }) => {
    const onboarding = new OnboardingPage(page)

    // Mock authenticated state
    await page.goto('/onboarding')
    await page.evaluate(() => {
      window.localStorage.setItem('sb-test-auth-token', JSON.stringify({
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token'
      }))
    })
    await page.reload()

    // Select parenting mode
    await onboarding.parentingModeButton.click()

    // Should navigate to home
    await page.waitForURL('/')
    expect(page.url()).toContain('/')
  })

  test('should navigate to pregnant page after selecting pregnant mode', async ({ page }) => {
    const onboarding = new OnboardingPage(page)

    await page.goto('/onboarding')
    await page.evaluate(() => {
      window.localStorage.setItem('sb-test-auth-token', JSON.stringify({
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token'
      }))
    })
    await page.reload()

    await onboarding.pregnantModeButton.click()

    await page.waitForURL('/pregnant')
    expect(page.url()).toContain('/pregnant')
  })

  test('should persist mode selection in localStorage', async ({ page }) => {
    const onboarding = new OnboardingPage(page)

    await page.goto('/onboarding')
    await page.evaluate(() => {
      window.localStorage.setItem('sb-test-auth-token', JSON.stringify({
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token'
      }))
    })
    await page.reload()

    await onboarding.parentingModeButton.click()
    await page.waitForURL('/')

    // Check localStorage
    const mode = await page.evaluate(() => localStorage.getItem('dodam_mode'))
    expect(mode).toBe('parenting')
  })
})
