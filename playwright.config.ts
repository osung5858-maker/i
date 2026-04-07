import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

// Load .env.local so Supabase credentials are available to global setup
loadEnvConfig(process.cwd())

/**
 * Playwright E2E Test Configuration
 * Framework: Next.js 16 App Router with Supabase Auth
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 3,
  timeout: 60000,
  reporter: process.env.CI
    ? [['github'], ['html']]
    : [['html'], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project - runs before all tests
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json', // Reuse auth
      },
      dependencies: ['setup'],
    },

    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
