import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

const authFile = path.join(__dirname, '.auth/user.json')

/**
 * Global Setup - Run once before all tests
 * Creates authenticated session with proper Supabase cookies for middleware
 *
 * Strategies (in order):
 * 1. Service role key → create test user + sign in → real cookies
 * 2. Anon key only → sign in existing test user → real cookies
 * 3. No credentials → write minimal storageState so tests can skip gracefully
 */
setup('authenticate', async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const testEmail = process.env.TEST_USER_EMAIL || 'e2e-test@dodam.local'
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

  // Ensure .auth directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase credentials not found. Writing minimal auth state.')
    console.warn('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    // Write minimal storageState — tests will be redirected to /onboarding
    fs.writeFileSync(authFile, JSON.stringify({
      cookies: [],
      origins: [{
        origin: 'http://localhost:3000',
        localStorage: [{ name: 'dodam_mode', value: 'pregnant' }],
      }],
    }))
    return
  }

  // Strategy 1: Create test user with service role key
  if (serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: createError } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { name: 'E2E Test User' },
    })

    if (createError && !createError.message.includes('already registered')) {
      console.warn('⚠️  Failed to create test user:', createError.message)
    } else {
      console.log('✓ Test user ready:', testEmail)
    }
  }

  // Sign in via Supabase JS client to get real session
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (signInError || !signInData.session) {
    console.warn('⚠️  Sign-in failed:', signInError?.message || 'no session')
    console.warn('   Ensure TEST_USER_EMAIL/TEST_USER_PASSWORD are valid, or set SUPABASE_SERVICE_ROLE_KEY')
    // Write minimal storageState
    fs.writeFileSync(authFile, JSON.stringify({
      cookies: [],
      origins: [{
        origin: 'http://localhost:3000',
        localStorage: [{ name: 'dodam_mode', value: 'pregnant' }],
      }],
    }))
    return
  }

  const session = signInData.session
  const projectRef = supabaseUrl.split('//')[1].split('.')[0]

  // Navigate to app and inject auth cookies + localStorage
  await page.goto('/onboarding')

  // Set Supabase auth cookies (what the middleware reads)
  const cookieBase = {
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
    expires: Math.floor(Date.now() / 1000) + 3600,
  }

  await page.context().addCookies([
    {
      name: `sb-${projectRef}-auth-token.0`,
      value: `base64-${Buffer.from(JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: 'bearer',
        user: session.user,
      })).toString('base64')}`,
      ...cookieBase,
    },
    {
      name: `sb-${projectRef}-auth-token`,
      value: `base64-${Buffer.from(JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: 'bearer',
        user: session.user,
      })).toString('base64')}`,
      ...cookieBase,
    },
  ])

  // Also set localStorage for client-side auth checks
  await page.evaluate(({ url, sess }) => {
    const ref = url.split('//')[1].split('.')[0]
    localStorage.setItem('dodam_mode', 'pregnant')
    localStorage.setItem('dodam_user_name', 'E2E Test User')
    localStorage.setItem('dodam_guide_pregnant', 'done')
    localStorage.setItem('dodam_guide_waiting', 'done')

    // Due date ~200 days from now (for pregnant mode)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 200)
    localStorage.setItem('dodam_preg_duedate', dueDate.toISOString().split('T')[0])

    // Supabase client-side session
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess))
  }, { url: supabaseUrl, sess: session })

  // Navigate to verify auth works through middleware
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Check we're NOT redirected to /onboarding
  const url = page.url()
  if (url.includes('/onboarding')) {
    console.warn('⚠️  Auth cookies not accepted by middleware — still redirected to /onboarding')
    console.warn('   This may indicate cookie format mismatch. Tests may fail on protected routes.')
  } else {
    console.log('✓ Auth verified — middleware accepted session')
  }

  // Save auth state (cookies + localStorage)
  await page.context().storageState({ path: authFile })
  console.log('✓ Authentication state saved to', authFile)
})
