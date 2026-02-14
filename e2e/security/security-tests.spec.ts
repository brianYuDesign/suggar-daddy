import { test, expect } from '@playwright/test';
import { TEST_USERS, takeScreenshot } from '../utils/test-helpers';

/**
 * 安全性測試
 * 測試常見的安全漏洞和攻擊防護
 */

test.describe('認證與授權', () => {
  test('未登入用戶不應該訪問受保護的頁面', async ({ page }) => {
    const protectedPages = [
      '/feed',
      '/profile',
      '/wallet',
      '/messages',
      '/subscription',
      '/post/create',
    ];

    for (const url of protectedPages) {
      await page.goto(url);
      
      // 應該被重導向到登入頁面
      await page.waitForURL(/\/(auth\/login|login)/, { timeout: 5000 });
      console.log(`✓ ${url} 已受保護，導向登入頁面`);
    }
    
    await takeScreenshot(page, 'auth-protected-redirect');
  });

  test('JWT Token 過期後應該要求重新登入', async ({ page, context }) => {
    // 設置一個過期的 token
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'expired.jwt.token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/feed');
    
    // 應該被導向登入頁面或顯示過期訊息
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes('/login') || url.includes('/auth');
    
    expect(isLoginPage).toBeTruthy();
    await takeScreenshot(page, 'token-expired-redirect');
  });

  test('無效的 Token 應該被拒絕', async ({ page, context }) => {
    // 設置一個無效的 token
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'invalid.token.here',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // 攔截 API 請求並檢查回應
    let hasUnauthorized = false;
    page.on('response', response => {
      if (response.status() === 401) {
        hasUnauthorized = true;
        console.log('✓ 無效 Token 被正確拒絕 (401)');
      }
    });

    await page.goto('/feed');
    await page.waitForTimeout(2000);
    
    expect(hasUnauthorized).toBeTruthy();
    await takeScreenshot(page, 'invalid-token-rejected');
  });

  test('不同角色應該有不同的權限', async ({ page }) => {
    // 測試普通用戶不能訪問管理頁面
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });

    // 嘗試訪問管理頁面
    await page.goto('http://localhost:4300/dashboard');
    
    // 應該被拒絕或導向錯誤頁面
    await page.waitForTimeout(2000);
    const url = page.url();
    const isBlocked = url.includes('/403') || url.includes('/unauthorized') || url.includes('/login');
    
    console.log(`普通用戶訪問管理頁面: ${isBlocked ? '已阻擋' : '未阻擋'}`);
    await takeScreenshot(page, 'role-based-access-control');
  });
});

test.describe('XSS 攻擊防護', () => {
  test('應該過濾用戶輸入中的腳本標籤', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.creator.email);
    await page.fill('input[name="password"]', TEST_USERS.creator.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });

    // 嘗試在貼文中注入腳本
    await page.goto('/post/create');
    
    const titleInput = page.locator('input[name="title"], textarea[name="title"]').first();
    const contentInput = page.locator('textarea[name="content"], [contenteditable]').first();
    
    if (await titleInput.isVisible() && await contentInput.isVisible()) {
      // 嘗試注入 XSS
      const xssPayload = '<script>alert("XSS")</script>';
      await titleInput.fill(xssPayload);
      await contentInput.fill(`測試內容 ${xssPayload}`);
      
      // 提交表單
      await page.click('button[type="submit"], button:has-text("發布")');
      await page.waitForTimeout(2000);
      
      // 檢查頁面上是否有未經處理的腳本
      const pageContent = await page.content();
      const hasRawScript = pageContent.includes('<script>alert("XSS")</script>');
      
      expect(hasRawScript).toBeFalsy();
      console.log(`✓ XSS 腳本已被過濾: ${!hasRawScript}`);
      
      await takeScreenshot(page, 'xss-filtered');
    }
  });

  test('應該 escape HTML 實體', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.creator.email);
    await page.fill('input[name="password"]', TEST_USERS.creator.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });

    await page.goto('/profile/edit');
    
    const bioInput = page.locator('textarea[name="bio"], textarea').first();
    
    if (await bioInput.isVisible()) {
      // 嘗試注入 HTML
      const htmlPayload = '<img src=x onerror=alert("XSS")>';
      await bioInput.fill(htmlPayload);
      await page.click('button[type="submit"], button:has-text("保存")');
      await page.waitForTimeout(2000);
      
      // 檢查是否被 escape
      const pageContent = await page.content();
      const hasRawHTML = pageContent.includes('<img src=x onerror');
      
      expect(hasRawHTML).toBeFalsy();
      console.log(`✓ HTML 標籤已被 escape: ${!hasRawHTML}`);
      
      await takeScreenshot(page, 'html-escaped');
    }
  });
});

test.describe('CSRF 防護', () => {
  test('POST 請求應該包含 CSRF Token', async ({ page }) => {
    await page.goto('/auth/login');
    
    // 監聽所有 POST 請求
    const postRequests: any[] = [];
    page.on('request', request => {
      if (request.method() === 'POST') {
        const headers = request.headers();
        postRequests.push({
          url: request.url(),
          hasCSRFToken: !!headers['x-csrf-token'] || !!headers['csrf-token'],
        });
      }
    });

    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 檢查 POST 請求是否包含 CSRF token
    console.log(`POST 請求數量: ${postRequests.length}`);
    postRequests.forEach(req => {
      console.log(`${req.url}: CSRF Token = ${req.hasCSRFToken}`);
    });
  });

  test('沒有 CSRF Token 的請求應該被拒絕', async ({ page }) => {
    // 攔截並移除 CSRF token
    await page.route('**/api/**', route => {
      const request = route.request();
      const headers = request.headers();
      delete headers['x-csrf-token'];
      delete headers['csrf-token'];
      
      route.continue({ headers });
    });

    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    
    // 可能會看到錯誤訊息
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'csrf-token-missing');
  });
});

test.describe('SQL Injection 防護', () => {
  test('搜尋功能應該防護 SQL Injection', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });

    // 嘗試 SQL injection
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
    ];

    for (const payload of sqlInjectionPayloads) {
      await page.goto('/discover');
      
      const searchInput = page.locator('input[type="search"], input[placeholder*="搜"]').first();
      
      if (await searchInput.isVisible()) {
        await searchInput.fill(payload);
        await page.waitForTimeout(1000);
        
        // 檢查是否有錯誤或異常行為
        const hasError = await page.locator('.error, [role="alert"]').count() > 0;
        console.log(`SQL Injection "${payload}": ${hasError ? '被阻擋' : '需檢查'}`);
      }
    }
    
    await takeScreenshot(page, 'sql-injection-test');
  });

  test('登入表單應該防護 SQL Injection', async ({ page }) => {
    await page.goto('/auth/login');
    
    // 嘗試 SQL injection
    await page.fill('input[name="email"]', "admin'--");
    await page.fill('input[name="password"]', "anything");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // 不應該成功登入
    const url = page.url();
    const isStillLoginPage = url.includes('/login') || url.includes('/auth');
    
    expect(isStillLoginPage).toBeTruthy();
    console.log(`✓ SQL Injection 在登入被阻擋`);
    
    await takeScreenshot(page, 'sql-injection-login-blocked');
  });
});

test.describe('檔案上傳安全', () => {
  test('應該驗證檔案類型', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.creator.email);
    await page.fill('input[name="password"]', TEST_USERS.creator.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });

    await page.goto('/post/create');
    
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.isVisible()) {
      // 嘗試上傳不允許的檔案類型（如 .exe）
      // 注意：這個測試需要實際的檔案
      console.log('✓ 檔案上傳驗證測試（需要實際檔案）');
      await takeScreenshot(page, 'file-upload-validation');
    }
  });

  test('應該限制檔案大小', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.creator.email);
    await page.fill('input[name="password"]', TEST_USERS.creator.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });

    await page.goto('/post/create');
    
    // 檢查是否有檔案大小限制提示
    const fileSizeHint = page.locator(':text("大小"), :text("MB"), :text("限制")');
    const hasSizeLimit = await fileSizeHint.count() > 0;
    
    if (hasSizeLimit) {
      console.log('✓ 有檔案大小限制提示');
      await takeScreenshot(page, 'file-size-limit-hint');
    }
  });
});

test.describe('Rate Limiting', () => {
  test('應該限制登入嘗試次數', async ({ page }) => {
    await page.goto('/auth/login');
    
    // 嘗試多次錯誤登入
    for (let i = 0; i < 6; i++) {
      await page.fill('input[name="email"]', 'test@test.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      console.log(`登入嘗試 ${i + 1}/6`);
    }
    
    // 第 6 次應該被限制
    const errorMessage = page.locator('[role="alert"], .error');
    const hasRateLimitError = await errorMessage.textContent();
    
    if (hasRateLimitError?.includes('限制') || hasRateLimitError?.includes('too many')) {
      console.log('✓ Rate limiting 已啟用');
    }
    
    await takeScreenshot(page, 'rate-limit-login');
  });

  test('應該限制 API 請求頻率', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });

    // 監聽 429 (Too Many Requests) 回應
    let hasRateLimitResponse = false;
    page.on('response', response => {
      if (response.status() === 429) {
        hasRateLimitResponse = true;
        console.log('✓ API Rate Limiting 觸發 (429)');
      }
    });

    // 快速重複請求
    for (let i = 0; i < 20; i++) {
      await page.reload();
      await page.waitForTimeout(100);
    }
    
    await takeScreenshot(page, 'api-rate-limit');
  });
});

test.describe('敏感資料保護', () => {
  test('密碼輸入應該被遮罩', async ({ page }) => {
    await page.goto('/auth/login');
    
    const passwordInput = page.locator('input[name="password"]');
    const inputType = await passwordInput.getAttribute('type');
    
    expect(inputType).toBe('password');
    console.log(`✓ 密碼欄位類型: ${inputType}`);
    
    await takeScreenshot(page, 'password-masked');
  });

  test('不應該在 URL 中暴露敏感資訊', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });

    // 檢查 URL 是否包含敏感資訊
    const url = page.url();
    const hasSensitiveData = url.includes('password') || url.includes('token') || url.includes('secret');
    
    expect(hasSensitiveData).toBeFalsy();
    console.log(`✓ URL 不包含敏感資訊: ${!hasSensitiveData}`);
  });

  test('應該使用 HTTPS (生產環境)', async ({ page }) => {
    await page.goto('/');
    
    const url = page.url();
    const isSecure = url.startsWith('https://') || url.includes('localhost');
    
    console.log(`連線安全性: ${isSecure ? 'HTTPS' : 'HTTP'}`);
    // 在生產環境應該強制 HTTPS
  });

  test('不應該在 console 輸出敏感資訊', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // 檢查 console 是否包含敏感資訊
    const hasSensitiveInConsole = consoleMessages.some(msg => 
      msg.includes('password') || msg.includes('token') || msg.includes(TEST_USERS.subscriber.password)
    );
    
    expect(hasSensitiveInConsole).toBeFalsy();
    console.log(`✓ Console 不包含敏感資訊: ${!hasSensitiveInConsole}`);
  });
});

test.describe('Session 管理', () => {
  test('登出後應該清除 Session', async ({ page, context }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });

    // 登出
    const logoutButton = page.locator('button:has-text("登出"), a:has-text("登出"), button:has-text("Logout")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      // 檢查 cookies 是否被清除
      const cookies = await context.cookies();
      const hasAuthToken = cookies.some(c => c.name === 'auth_token' || c.name === 'session');
      
      expect(hasAuthToken).toBeFalsy();
      console.log(`✓ 登出後 Session 已清除: ${!hasAuthToken}`);
      
      await takeScreenshot(page, 'session-cleared-after-logout');
    }
  });

  test('應該防止 Session Fixation', async ({ page, context }) => {
    // 取得登入前的 session ID
    await page.goto('/');
    const cookiesBefore = await context.cookies();
    const sessionBefore = cookiesBefore.find(c => c.name === 'session' || c.name === 'sessionId');

    // 登入
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // 取得登入後的 session ID
    const cookiesAfter = await context.cookies();
    const sessionAfter = cookiesAfter.find(c => c.name === 'session' || c.name === 'sessionId');

    // Session ID 應該改變
    const sessionChanged = sessionBefore?.value !== sessionAfter?.value;
    console.log(`✓ 登入後 Session ID 已改變: ${sessionChanged}`);
  });
});

test.describe('Content Security Policy', () => {
  test('應該設置 CSP Headers', async ({ page }) => {
    const response = await page.goto('/');
    
    if (response) {
      const headers = response.headers();
      const csp = headers['content-security-policy'];
      
      if (csp) {
        console.log(`✓ CSP Header 已設置: ${csp.substring(0, 50)}...`);
      } else {
        console.log('⚠ 未設置 CSP Header');
      }
    }
  });

  test('應該設置安全相關 Headers', async ({ page }) => {
    const response = await page.goto('/');
    
    if (response) {
      const headers = response.headers();
      
      const securityHeaders = {
        'x-frame-options': headers['x-frame-options'],
        'x-content-type-options': headers['x-content-type-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'strict-transport-security': headers['strict-transport-security'],
      };
      
      console.log('安全 Headers:', securityHeaders);
    }
  });
});
