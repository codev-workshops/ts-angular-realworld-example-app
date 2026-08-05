import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the React app.
 *
 * Reuses the Angular workspace's e2e suite verbatim (`../e2e`) so the migration
 * is validated against the exact same specs; only the baseURL / webServer differ.
 */
export default defineConfig({
  testDir: '../e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: 'html',

  timeout: 15000,

  use: {
    baseURL: 'http://localhost:4300',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5000,
    navigationTimeout: 10000,
  },

  expect: {
    timeout: 5000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
