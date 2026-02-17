import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 測試目錄
  testDir: './test/e2e/specs',
  
  // 測試匹配模式
  testMatch: '**/*.spec.ts',
  
  // 並行執行設定
  fullyParallel: false, // E2E 測試建議序列執行避免資料衝突
  workers: 1,
  
  // 失敗重試
  retries: process.env.CI ? 2 : 0,
  
  // 超時設定
  timeout: 60 * 1000, // 每個測試 60 秒
  expect: {
    timeout: 10 * 1000, // 斷言超時 10 秒
  },
  
  // Reporter 設定
  reporter: [
    ['html', { outputFolder: 'test/coverage/e2e-report' }],
    ['list'],
    ['json', { outputFile: 'test/coverage/e2e-results.json' }],
  ],
  
  // 全局設定
  use: {
    // Base URL
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
    
    // 追蹤設定（失敗時記錄）
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 瀏覽器設定
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // 等待設定
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
    
    // 自動重試失敗的操作
    testIdAttribute: 'data-testid',
  },
  
  // 測試專案（多瀏覽器）
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 可選：啟用開發者工具
        // launchOptions: {
        //   devtools: true,
        // },
      },
      dependencies: ['setup'],
    },
    
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
    
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
    },
    
    // Admin project（不同的 base URL）
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.E2E_ADMIN_URL || 'http://localhost:4300',
      },
      testMatch: '**/admin-flows/**/*.spec.ts',
      dependencies: ['setup'],
    },
  ],
  
  // Web Server 自動啟動（開發時）
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev',
      url: 'http://localhost:4200',
      timeout: 120 * 1000,
      reuseExistingServer: true,
    },
  ],
  
  // Output 目錄
  outputDir: 'test/coverage/e2e-artifacts',
  
  // 全局超時設定
  globalTimeout: 10 * 60 * 1000, // 10 分鐘
});

