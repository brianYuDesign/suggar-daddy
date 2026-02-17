import { defineConfig, devices } from '@playwright/test';

// 檢測是否為 headed 模式
const isHeaded = process.argv.includes('--headed');
const isDebug = process.argv.includes('--debug');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isHeaded, // headed 模式下禁用完全並行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: isHeaded || isDebug ? 1 : process.env.CI ? 1 : undefined, // headed 模式只用 1 個 worker
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4200', // 使用 IPv4 避免 IPv6 連接問題
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: isHeaded ? 'retain-on-failure' : 'on', // headed 模式只在失敗時保留視頻
  },
  projects: [
    // Auth setup — 只登入一次，保存 storageState
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Admin 測試 — 依賴 setup 完成的 admin auth state
    {
      name: 'admin',
      testMatch: /e2e\/admin\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
    // 主測試 — 依賴 setup 完成的 auth state
    {
      name: 'chromium',
      testIgnore: /e2e\/admin\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/subscriber.json',
      },
      dependencies: ['setup'],
    },
    // 完整測試時才運行其他瀏覽器
    ...(process.env.FULL_BROWSER_TEST ? [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
        dependencies: ['setup'],
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
        dependencies: ['setup'],
      },
      {
        name: 'mobile-chrome',
        use: { ...devices['Pixel 5'] },
        dependencies: ['setup'],
      },
      {
        name: 'mobile-safari',
        use: { ...devices['iPhone 12'] },
        dependencies: ['setup'],
      },
    ] : []),
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'npm run serve:web',
          url: 'http://127.0.0.1:4200', // 使用 IPv4
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      ],
  outputDir: 'test-results/',
});
