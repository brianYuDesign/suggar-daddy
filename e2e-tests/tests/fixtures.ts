import { test as base, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export const USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    role: 'ADMIN',
  },
  creator: {
    email: 'creator@example.com',
    password: 'Creator123!@#',
    role: 'CREATOR',
  },
  viewer: {
    email: 'viewer@example.com',
    password: 'Viewer123!@#',
    role: 'USER',
  },
};

export const API_BASE_URLS = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001/api',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002/api',
  content: process.env.CONTENT_SERVICE_URL || 'http://localhost:3003/api',
  recommendation: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3004/api',
};

type AuthFixtures = {
  authenticatedPage: Page;
  creatorAuthPage: Page;
  guestPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login as viewer
    await page.goto('/login');
    await page.fill('input[name="email"]', USERS.viewer.email);
    await page.fill('input[name="password"]', USERS.viewer.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    await use(page);
  },

  creatorAuthPage: async ({ page }, use) => {
    // Login as creator
    await page.goto('/login');
    await page.fill('input[name="email"]', USERS.creator.email);
    await page.fill('input[name="password"]', USERS.creator.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    await use(page);
  },

  guestPage: async ({ page }, use) => {
    // No login, just use the page
    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to save test data for debugging
 */
export function saveTestData(testName: string, data: any) {
  const resultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const filePath = path.join(resultsDir, `${testName}-data.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Generate unique test data
 */
export function generateTestUser(overrides = {}) {
  const timestamp = Date.now();
  return {
    email: `test-user-${timestamp}@example.com`,
    password: `TestPass${timestamp}!@#`,
    name: `Test User ${timestamp}`,
    ...overrides,
  };
}

export function generateTestContent(overrides = {}) {
  const timestamp = Date.now();
  return {
    title: `Test Content ${timestamp}`,
    description: `Description for test content ${timestamp}`,
    category: 'Educational',
    duration: 3600,
    ...overrides,
  };
}
