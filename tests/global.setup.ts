import { test as setup, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

/**
 * Global Setup - Run once before all tests
 * Creates authenticated session for reuse across all tests
 *
 * NOTE: This requires SUPABASE_URL and SUPABASE_ANON_KEY environment variables
 * For CI/CD, also set SUPABASE_SERVICE_ROLE_KEY for test user creation
 */
setup('authenticate', async ({ page }) => {
  // Option 1: Use real OAuth (requires manual intervention)
  // Option 2: Use test credentials (requires test account)
  // Option 3: Mock auth with Supabase service role key

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase credentials not found. Skipping auth setup.')
    console.warn('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return
  }

  // Check if we can use service role for test user creation
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const testEmail = process.env.TEST_USER_EMAIL || 'test@dodam.local'
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

  if (serviceRoleKey) {
    // Create test user programmatically
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Test User',
        mode: 'parenting'
      }
    })

    if (createError && !createError.message.includes('already registered')) {
      throw new Error(`Failed to create test user: ${createError.message}`)
    }

    console.log('✓ Test user ready:', testEmail)
  }

  // Perform login via UI
  await page.goto('/onboarding')

  // For demo purposes, we'll set auth state directly
  // In real implementation, this would go through OAuth flow
  await page.evaluate(({ url, key, email, password }) => {
    // This is a simplified mock - replace with actual auth flow
    localStorage.setItem('dodam_mode', 'parenting')
    localStorage.setItem('dodam_user_name', 'Test User')

    // Set mock Supabase session
    const session = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'test-user-id',
        email: email,
        user_metadata: { name: 'Test User', mode: 'parenting' }
      }
    }

    localStorage.setItem('sb-' + url.split('//')[1].split('.')[0] + '-auth-token', JSON.stringify(session))
  }, {
    url: supabaseUrl,
    key: supabaseKey,
    email: testEmail,
    password: testPassword
  })

  // Navigate to home to verify login
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Verify we're on authenticated page
  const isAuthenticated = await page.evaluate(() => {
    return !!localStorage.getItem('dodam_mode')
  })

  if (!isAuthenticated) {
    throw new Error('Authentication setup failed')
  }

  // Save auth state
  await page.context().storageState({ path: authFile })

  console.log('✓ Authentication state saved to', authFile)
})
