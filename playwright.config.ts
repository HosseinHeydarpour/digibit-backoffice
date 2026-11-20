import { defineConfig, devices } from '@playwright/test';

const AUTH_FILE = 'e2e/.auth/admin.json';

/**
 * Playwright (BO-P06).
 *
 * The Angular dev server is started here; the real API is not, because it is a
 * separate repository and its working state belongs to whoever is running it.
 * `globalSetup` checks `localhost:5072` and fails with the exact command. The
 * setup project logs in once and saves the admin storageState for every spec;
 * `login.spec.ts` clears it to test the form itself.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm start -- --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    // A cold CI build of the Angular app is slower than the local warm one.
    timeout: 300_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
  ],
});
