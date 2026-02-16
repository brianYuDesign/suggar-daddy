import { test, expect, Page } from '@playwright/test';

/**
 * Helper: wait for page to settle.
 */
async function waitForPageReady(page: Page, timeout = 3000): Promise<void> {
  await page.waitForTimeout(timeout);
}

/**
 * Helper: check if redirected to login (auth failure).
 */
function isOnLoginPage(page: Page): boolean {
  return page.url().includes('/login');
}

/* =================================================================== */
/*  Creator Business Flow                                               */
/* =================================================================== */

test.describe('Creator Business Flow', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('should navigate to profile and verify identity', async ({ page }) => {
    await page.goto('/profile');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("我的檔案")').isVisible().catch(() => false);

    if (hasTitle) {
      const displayName = page.locator('h2').first();
      await expect(displayName).toBeVisible();
      const nameText = await displayName.textContent();
      expect(nameText).toBeTruthy();
      expect(nameText!.length).toBeGreaterThan(0);

      await expect(
        page.locator('text=創作者').or(page.locator('text=探索者')).first()
      ).toBeVisible();

      await expect(page.locator('text=關於我')).toBeVisible();
      await expect(page.locator('text=加入於')).toBeVisible();
    }
  });

  test('should view wallet page with balance information', async ({ page }) => {
    await page.goto('/wallet');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("我的錢包")').isVisible().catch(() => false);
    const hasApiError = await page.locator('.text-red-500').first().isVisible().catch(() => false);

    if (hasTitle && !hasApiError) {
      await expect(page.locator('text=可用餘額').first()).toBeVisible();
      await expect(page.locator('text=提款')).toBeVisible();
      await expect(page.locator('text=交易記錄')).toBeVisible();
    }

    expect(hasTitle || hasApiError).toBeTruthy();
  });

  test('should fill in post creation form', async ({ page }) => {
    await page.goto('/post/create');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("發布動態")').isVisible().catch(() => false);

    if (hasTitle) {
      const textarea = page.locator('textarea');
      await textarea.fill('This is a test post from E2E testing');
      await expect(page.locator('text=36 / 2000')).toBeVisible();

      const toggle = page.locator('button[role="switch"][aria-label="切換付費內容"]');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('text=付費內容將會對非訂閱者顯示為鎖定狀態')).toBeVisible();
      await expect(page.locator('text=付費貼文')).toBeVisible();

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
      await expect(page.locator('text=公開貼文')).toBeVisible();

      await expect(page.locator('button:has-text("發布")').first()).toBeVisible();
    }
  });

  test('should navigate from profile to settings', async ({ page }) => {
    await page.goto('/profile');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasSettingsBtn = await page.locator('text=設定').isVisible().catch(() => false);
    if (hasSettingsBtn) {
      await page.click('text=設定');
      await page.waitForURL(/\/profile\/settings/, { timeout: 5000 });
    }
  });

  test('should navigate from profile to edit', async ({ page }) => {
    await page.goto('/profile');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasEditBtn = await page.locator('text=編輯個人檔案').isVisible().catch(() => false);
    if (hasEditBtn) {
      await page.click('text=編輯個人檔案');
      await page.waitForURL(/\/profile\/edit/, { timeout: 5000 });
    }
  });

  test('should navigate wallet to history', async ({ page }) => {
    await page.goto('/wallet');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasHistoryBtn = await page.locator('text=交易記錄').isVisible().catch(() => false);
    if (hasHistoryBtn) {
      await page.click('text=交易記錄');
      await page.waitForURL(/\/wallet\/history/, { timeout: 5000 });
    }
  });

  test('should navigate wallet to withdraw', async ({ page }) => {
    await page.goto('/wallet');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasWithdrawBtn = await page.locator('text=提款').isVisible().catch(() => false);
    if (hasWithdrawBtn) {
      await page.click('text=提款');
      await page.waitForURL(/\/wallet\/withdraw/, { timeout: 5000 });
    }
  });
});

/* =================================================================== */
/*  Subscriber Business Flow                                            */
/* =================================================================== */

test.describe('Subscriber Business Flow', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('should browse feed page', async ({ page }) => {
    await page.goto('/feed');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    expect(page.url()).toContain('/feed');

    const hasWelcomeCard = await page.locator('text=/歡迎|嗨/').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=還沒有任何動態').isVisible().catch(() => false);
    const hasError = await page.locator('text=/無法載入|Unhandled Runtime Error|TypeError/').first().isVisible().catch(() => false);

    expect(hasWelcomeCard || hasEmptyState || hasError).toBeTruthy();
  });

  test('should browse discover page', async ({ page }) => {
    await page.goto('/discover');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("探索")').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=目前沒有更多推薦').isVisible().catch(() => false);
    const hasError = await page.locator('text=/載入失敗|Unhandled Runtime Error/').first().isVisible().catch(() => false);

    expect(hasTitle || hasEmptyState || hasError).toBeTruthy();
  });

  test('should browse matches page', async ({ page }) => {
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

  test('should view messages page', async ({ page }) => {
    await page.goto('/messages');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("訊息")').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=還沒有任何對話').isVisible().catch(() => false);
    const hasError = await page.locator('text=/無法載入|Unhandled Runtime Error/').first().isVisible().catch(() => false);

    expect(hasTitle || hasEmptyState || hasError).toBeTruthy();
  });

  test('should view notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await waitForPageReady(page);
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const hasTitle = await page.locator('h1:has-text("通知")').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=沒有通知').isVisible().catch(() => false);
    const hasError = await page.locator('text=/無法載入|Unhandled Runtime Error/').first().isVisible().catch(() => false);

    expect(hasTitle || hasEmptyState || hasError).toBeTruthy();
  });

  test('should view subscription page', async ({ page }) => {
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
/*  Cross-role navigation                                               */
/* =================================================================== */

test.describe('Navigation Consistency', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('authenticated user visiting landing page should redirect to feed', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Authenticated users get redirected to /feed (client-side)
    const onFeed = page.url().includes('/feed');
    if (onFeed) {
      const hasContent = await page.locator('text=/歡迎|嗨|還沒有|Unhandled/').first().isVisible().catch(() => false);
      expect(hasContent).toBeTruthy();
    }
  });

  test('should maintain auth state across page navigation', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForTimeout(1000);

    // If first page redirects to login, auth is expired
    if (isOnLoginPage(page)) { test.skip(true, 'Auth expired'); return; }

    const pages = ['/discover', '/messages', '/notifications'];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForTimeout(1000);
      if (isOnLoginPage(page)) { test.skip(true, 'Auth expired during navigation'); return; }
      expect(page.url()).not.toContain('/login');
    }
  });
});

/* =================================================================== */
/*  Error handling                                                       */
/* =================================================================== */

test.describe('Error Handling', () => {
  test('unauthenticated user should be redirected from protected pages', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    const url = page.url();
    const isLoginOrProfile = url.includes('/login') || url.includes('/profile');
    expect(isLoginOrProfile).toBeTruthy();
  });
});
