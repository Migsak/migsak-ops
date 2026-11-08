import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests run the production build against tests/e2e/mock-supabase.mjs,
 * so they need no real Supabase project and use only fictional data.
 */
const APP_PORT = 4310;
const MOCK_PORT = 54321;
const mockUrl = `http://127.0.0.1:${MOCK_PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /responsive\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.ts/ }
  ],
  webServer: [
    {
      command: 'node tests/e2e/mock-supabase.mjs',
      url: `${mockUrl}/__state`,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_SUPABASE_PORT: String(MOCK_PORT) }
    },
    {
      command: `npm run build && npx next start -p ${APP_PORT}`,
      url: `http://127.0.0.1:${APP_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: mockUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        APP_TIMEZONE: 'Asia/Kolkata',
        NEXT_TELEMETRY_DISABLED: '1'
      }
    }
  ]
});
