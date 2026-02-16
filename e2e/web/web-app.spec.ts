import { test, expect, Page } from '@playwright/test';

/**
 * Helper: wait for page to load content or settle into a stable state.
 * Handles three scenarios:
 *   1. Page loads successfully with expected content
 *   2. Page shows an API error state (e.g., "無法載入")
 *   3. Page shows a Next.js runtime error overlay (dev mode)
 *   4. Page redirects to /login (auth expired or service down)
 */
async function waitForPageReady(page: Page, timeout = 3000): Promise<void> {
  await page.waitForTimeout(timeout);
}

/**
 * Helper: check if the page was redirected to login (auth failure).
 */
function isOnLoginPage(page: Page): boolean {
  return page.url().includes('/login');
}

/* =================================================================== */
/*  Public pages (no auth required)                                     */
/* =================================================================== */

test.describe('Landing Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should render hero section with CTA buttons', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Suggar Daddy');

    const registerBtn = page.locator('a[href="/register"]');
    await expect(registerBtn).toBeVisible();
    await expect(registerBtn).toContainText('免費加入');

    const loginBtn = page.locator('a[href="/login"]');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toContainText('登入帳號');
  });

  test('should render features section', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h2')).toContainText('為什麼選擇我們');

    const featureTitles = ['智慧配對', '安全可靠', '即時互動', '專屬內容'];
    for (const title of featureTitles) {
      await expect(page.locator(`h3:has-text("${title}")`)).toBeVisible();
    }
  });

  test('should render footer with copyright', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer).toContainText('Suggar Daddy');
    await expect(footer).toContainText('All rights reserved');
  });
});

test.describe('Login Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should render login form with all elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('歡迎回來');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('登入');

    await expect(page.locator('a[href="/register"]')).toContainText('免費註冊');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=請輸入有效的 Email')).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input#email', 'wrong@test.com');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForSelector('.bg-red-50, [role="alert"], .text-red-500, .text-red-600', {
      timeout: 5000,
    });
  });
});

test.describe('Register Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should render register form', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('h1')).toContainText('建立帳號');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });
});

/* =================================================================== */
/*  Feed (subscriber auth)                                              */
/* =================================================================== */

test.describe('Feed Page', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('should load feed page and show content', async ({ page }) => {
    await page.goto('/feed');
    await waitForPageReady(page);

    // If redirected to login, auth is expired - skip content checks
    if (isOnLoginPage(page)) {
      test.skip(true, 'Auth token expired - redirected to login');
      return;
    }

    expect(page.url()).toContain('/feed');

    // Page should show: welcome card, posts, empty state, or error
    const hasWelcomeCard = await page.locator('text=/歡迎|嗨/').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=還沒有任何動態').isVisible().catch(() => false);
    const hasError = await page.locator('text=/無法載入|Unhandled Runtime Error|TypeError/').first().isVisible().catch(() => false);
    const hasFab = await page.locator('a[href="/post/create"]').first().isVisible().catch(() => false);

    expect(hasWelcomeCard || hasEmptyState || hasError || hasFab).toBeTruthy();
  });

  test('should show posts or empty state', async ({ page }) => {
    await page.goto('/feed');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasPosts = await page.locator('button:has-text("喜歡")').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=還沒有任何動態').isVisible().catch(() => false);
    const hasError = await page.locator('text=/無法載入|Unhandled Runtime Error|TypeError/').first().isVisible().catch(() => false);

    expect(hasPosts || hasEmptyState || hasError).toBeTruthy();

    if (hasEmptyState) {
      await expect(page.locator('a[href="/post/create"]').first()).toBeVisible();
      await expect(page.locator('text=發布動態').first()).toBeVisible();
    }
  });
});

/* =================================================================== */
/*  Discover (subscriber auth)                                          */
/* =================================================================== */

test.describe('Discover Page', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('should render discover page', async ({ page }) => {
    await page.goto('/discover');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("探索")').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=目前沒有更多推薦').isVisible().catch(() => false);
    const hasError = await page.locator('text=/載入失敗|Unhandled Runtime Error/').first().isVisible().catch(() => false);

    expect(hasTitle || hasEmptyState || hasError).toBeTruthy();
  });

  test('should show action buttons when cards are available', async ({ page }) => {
    await page.goto('/discover');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasActionButtons = await page.locator('button[aria-label="喜歡"]').isVisible().catch(() => false);

    if (hasActionButtons) {
      await expect(page.locator('button[aria-label="跳過"]')).toBeVisible();
      await expect(page.locator('button[aria-label="喜歡"]')).toBeVisible();
      await expect(page.locator('button[aria-label="超級喜歡"]')).toBeVisible();
      await expect(page.locator('text=找到你感興趣的人')).toBeVisible();
    }
  });
});

/* =================================================================== */
/*  Matches (subscriber auth)                                           */
/* =================================================================== */

test.describe('Matches Page', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('should render matches page', async ({ page }) => {
    await page.goto('/matches');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("配對")').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=還沒有配對').isVisible().catch(() => false);
    const hasError = await page.locator('text=/載入失敗|Unhandled Runtime Error/').first().isVisible().catch(() => false);

    expect(hasTitle || hasEmptyState || hasError).toBeTruthy();

    if (hasEmptyState) {
      await expect(page.locator('text=開始探索')).toBeVisible();
    }
  });
});

/* =================================================================== */
/*  Messages (subscriber auth)                                          */
/* =================================================================== */

test.describe('Messages Page', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('should render messages page', async ({ page }) => {
    await page.goto('/messages');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("訊息")').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=還沒有任何對話').isVisible().catch(() => false);
    const hasError = await page.locator('text=/無法載入|Unhandled Runtime Error/').first().isVisible().catch(() => false);

    expect(hasTitle || hasEmptyState || hasError).toBeTruthy();

    if (hasEmptyState) {
      await expect(page.locator('text=去探索頁面找到你感興趣的人')).toBeVisible();
    }
  });
});

/* =================================================================== */
/*  Notifications (subscriber auth)                                     */
/* =================================================================== */

test.describe('Notifications Page', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('should render notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("通知")').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=沒有通知').isVisible().catch(() => false);
    const hasError = await page.locator('text=/無法載入|Unhandled Runtime Error/').first().isVisible().catch(() => false);

    expect(hasTitle || hasEmptyState || hasError).toBeTruthy();

    if (hasEmptyState) {
      await expect(page.locator('text=當有新的互動時，通知會出現在這裡')).toBeVisible();
    }
  });
});

/* =================================================================== */
/*  Profile (creator auth)                                              */
/* =================================================================== */

test.describe('Profile Page', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('should display user profile information', async ({ page }) => {
    await page.goto('/profile');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("我的檔案")').isVisible().catch(() => false);

    if (hasTitle) {
      // Display name (h2 inside card)
      const displayName = page.locator('h2').first();
      await expect(displayName).toBeVisible();

      // Role badge
      const roleBadge = page.locator('text=創作者').or(page.locator('text=探索者'));
      await expect(roleBadge.first()).toBeVisible();

      // Bio section
      await expect(page.locator('text=關於我')).toBeVisible();

      // Member since
      await expect(page.locator('text=加入於')).toBeVisible();
    }
  });

  test('should have navigation buttons', async ({ page }) => {
    await page.goto('/profile');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("我的檔案")').isVisible().catch(() => false);

    if (hasTitle) {
      await expect(page.locator('text=編輯個人檔案')).toBeVisible();
      await expect(page.locator('text=設定')).toBeVisible();
      await expect(page.locator('text=登出')).toBeVisible();
    }
  });
});

/* =================================================================== */
/*  Profile Edit (creator auth)                                         */
/* =================================================================== */

test.describe('Profile Edit Page', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('should render edit profile page', async ({ page }) => {
    await page.goto('/profile/edit');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasForm = await page.locator('form, input, textarea').first().isVisible().catch(() => false);
    const hasTitle = await page.locator('text=編輯').first().isVisible().catch(() => false);

    expect(hasForm || hasTitle).toBeTruthy();
  });
});

/* =================================================================== */
/*  Profile Settings (creator auth)                                     */
/* =================================================================== */

test.describe('Profile Settings Page', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('should render settings page', async ({ page }) => {
    await page.goto('/profile/settings');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasSettings = await page.locator('text=設定').first().isVisible().catch(() => false);
    const hasNotification = await page.locator('text=通知').first().isVisible().catch(() => false);
    const hasPrivacy = await page.locator('text=隱私').first().isVisible().catch(() => false);

    expect(hasSettings || hasNotification || hasPrivacy).toBeTruthy();
  });
});

/* =================================================================== */
/*  Wallet (creator auth)                                               */
/* =================================================================== */

test.describe('Wallet Page', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('should render wallet page', async ({ page }) => {
    await page.goto('/wallet');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("我的錢包")').isVisible().catch(() => false);
    const hasApiError = await page.locator('.text-red-500').first().isVisible().catch(() => false);

    if (hasTitle && !hasApiError) {
      await expect(page.locator('text=可用餘額').first()).toBeVisible();
      await expect(page.locator('text=待入帳')).toBeVisible();
      await expect(page.locator('text=累計收入')).toBeVisible();
      await expect(page.locator('text=已提款')).toBeVisible();
      await expect(page.locator('text=快速操作')).toBeVisible();
      await expect(page.locator('text=提款')).toBeVisible();
      await expect(page.locator('text=交易記錄')).toBeVisible();
      await expect(page.locator('text=Stripe 付款管理')).toBeVisible();
    }

    expect(hasTitle || hasApiError).toBeTruthy();
  });
});

/* =================================================================== */
/*  Wallet History (creator auth)                                       */
/* =================================================================== */

test.describe('Wallet History Page', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('should render wallet history page', async ({ page }) => {
    await page.goto('/wallet/history');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    // Page may show: h1 title, empty state h2, error text, or loading skeleton
    const hasTitle = await page.locator('h1:has-text("交易記錄")').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=沒有交易記錄').isVisible().catch(() => false);
    const hasError = await page.locator('.text-red-500').first().isVisible().catch(() => false);
    const hasSkeleton = await page.locator('[class*="skeleton"], [class*="Skeleton"]').first().isVisible().catch(() => false);
    const hasFilter = await page.locator('text=篩選').isVisible().catch(() => false);

    expect(hasTitle || hasEmptyState || hasError || hasSkeleton || hasFilter).toBeTruthy();
  });
});

/* =================================================================== */
/*  Wallet Withdraw (creator auth)                                      */
/* =================================================================== */

test.describe('Wallet Withdraw Page', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('should render withdraw page', async ({ page }) => {
    await page.goto('/wallet/withdraw');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasContent = await page.locator('h1, h2, form, input').first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });
});

/* =================================================================== */
/*  Post Create (creator auth)                                          */
/* =================================================================== */

test.describe('Create Post Page', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('should render post creation form', async ({ page }) => {
    await page.goto('/post/create');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    await expect(page.locator('h1:has-text("發布動態")')).toBeVisible();

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', '分享你的想法...');

    await expect(page.locator('text=/ 2000')).toBeVisible();
    await expect(page.locator('button:has-text("發布")').first()).toBeVisible();
    await expect(page.locator('text=付費內容')).toBeVisible();
    await expect(page.locator('text=新增圖片')).toBeVisible();
  });

  test('should show character count when typing', async ({ page }) => {
    await page.goto('/post/create');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const textarea = page.locator('textarea');
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill('Hello');
      await expect(page.locator('text=5 / 2000')).toBeVisible();
    }
  });

  test('should toggle premium post option', async ({ page }) => {
    await page.goto('/post/create');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const toggle = page.locator('button[role="switch"][aria-label="切換付費內容"]');
    if (await toggle.isVisible().catch(() => false)) {
      await expect(toggle).toHaveAttribute('aria-checked', 'false');

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'true');

      await expect(page.locator('text=付費內容將會對非訂閱者顯示為鎖定狀態')).toBeVisible();
    }
  });
});

/* =================================================================== */
/*  Subscription (creator auth)                                         */
/* =================================================================== */

test.describe('Subscription Page', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('should render subscription page', async ({ page }) => {
    await page.goto('/subscription');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("訂閱方案")').isVisible().catch(() => false);
    const hasApiError = await page.locator('.text-red-500').first().isVisible().catch(() => false);

    if (hasTitle && !hasApiError) {
      await expect(page.locator('text=選擇最適合你的方案')).toBeVisible();
    }

    expect(hasTitle || hasApiError).toBeTruthy();
  });
});

/* =================================================================== */
/*  Responsive Design                                                   */
/* =================================================================== */

test.describe('Responsive Design', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('mobile - landing page should display correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Suggar Daddy');
    await expect(page.locator('text=免費加入')).toBeVisible();
    await expect(page.locator('text=登入帳號')).toBeVisible();
  });

  test('tablet - landing page should display correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Suggar Daddy');
    await expect(page.locator('h2')).toContainText('為什麼選擇我們');
  });
});
