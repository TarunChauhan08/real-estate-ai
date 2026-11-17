import { defineConfig, devices } from '@playwright/test';

/**
 * Browser end-to-end tests. They drive the real web app against the real API.
 * Start both first (`pnpm dev`), or let Playwright start them via `webServer` below.
 * PLAYWRIGHT_CHROMIUM_PATH can point at an installed Chrome instead of `npx playwright install chromium`.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
      testIgnore: /responsive\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], launchOptions: { executablePath } },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @rea/api run dev',
      url: 'http://localhost:4000/api/v1/health',
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: '../..',
    },
    {
      command: 'pnpm --filter @rea/web run dev',
      url: 'http://localhost:3000/login',
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: '../..',
    },
  ],
});
