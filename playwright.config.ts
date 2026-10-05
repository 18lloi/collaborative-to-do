import { defineConfig, devices } from '@playwright/test'
import { localSupabase } from './e2e/support/local-supabase'

const supabase = localSupabase()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: supabase.API_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: supabase.PUBLISHABLE_KEY,
    },
  },
})
