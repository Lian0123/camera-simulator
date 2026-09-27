import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', fullyParallel: true, reporter: 'list', timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], locale: 'en-US' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], locale: 'en-US' } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], locale: 'en-US' } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], locale: 'zh-TW' } },
    { name: 'mobile-360', use: { browserName: 'chromium', viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-TW' } },
  ],
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173/camera-simulator/', reuseExistingServer: !process.env.CI, timeout: 90_000 },
});
