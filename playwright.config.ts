import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4177',
    channel: process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? undefined : process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'node --import tsx script/browser-server.mjs',
    url: 'http://127.0.0.1:4177/api/health',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
