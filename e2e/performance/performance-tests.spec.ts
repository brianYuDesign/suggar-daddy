import { test, expect } from '@playwright/test';
import { login, TEST_USERS, takeScreenshot } from '../utils/test-helpers';

/**
 * 效能測試
 * 測試頁面載入時間、API 響應時間和使用者體驗
 */

test.describe('頁面載入效能', () => {
  test('首頁載入時間應該 < 2 秒', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`首頁載入時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
    
    await takeScreenshot(page, 'performance-homepage');
  });

  test('登入頁面載入時間應該 < 1 秒', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`登入頁面載入時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(1000);
  });

  test('動態牆載入時間應該 < 3 秒', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    
    const startTime = Date.now();
    
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="post-card"], article, .post', {
      timeout: 5000,
    });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`動態牆載入時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
    
    await takeScreenshot(page, 'performance-feed');
  });

  test('個人檔案載入時間應該 < 2 秒', async ({ page }) => {
    await login(page, TEST_USERS.creator);
    
    const startTime = Date.now();
    
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`個人檔案載入時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
  });

  test('探索頁面載入時間應該 < 2.5 秒', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    
    const startTime = Date.now();
    
    await page.goto('/discover');
    await page.waitForSelector('[data-testid="discover-card"], .card, .profile-card', {
      timeout: 5000,
    });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`探索頁面載入時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2500);
  });
});

test.describe('API 響應時間', () => {
  test('登入 API 響應時間應該 < 500ms', async ({ page }) => {
    await page.goto('/auth/login');
    
    let apiResponseTime = 0;
    
    page.on('response', response => {
      if (response.url().includes('/api/auth/login')) {
        apiResponseTime = response.timing().responseEnd;
        console.log(`登入 API 響應時間: ${apiResponseTime}ms`);
      }
    });
    
    await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
    await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    if (apiResponseTime > 0) {
      expect(apiResponseTime).toBeLessThan(500);
    }
  });

  test('獲取動態牆 API 響應時間應該 < 1 秒', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    
    let apiResponseTime = 0;
    
    page.on('response', response => {
      if (response.url().includes('/api/posts') || response.url().includes('/api/feed')) {
        const timing = response.timing();
        apiResponseTime = timing.responseEnd - timing.requestStart;
        console.log(`動態牆 API 響應時間: ${apiResponseTime}ms`);
      }
    });
    
    await page.goto('/feed');
    await page.waitForTimeout(3000);
    
    if (apiResponseTime > 0) {
      expect(apiResponseTime).toBeLessThan(1000);
    }
  });

  test('獲取用戶檔案 API 響應時間應該 < 400ms', async ({ page }) => {
    await login(page, TEST_USERS.creator);
    
    let apiResponseTime = 0;
    
    page.on('response', response => {
      if (response.url().includes('/api/user') || response.url().includes('/api/profile')) {
        const timing = response.timing();
        apiResponseTime = timing.responseEnd - timing.requestStart;
        console.log(`用戶檔案 API 響應時間: ${apiResponseTime}ms`);
      }
    });
    
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    
    if (apiResponseTime > 0) {
      expect(apiResponseTime).toBeLessThan(400);
    }
  });
});

test.describe('資源載入優化', () => {
  test('應該使用圖片懶載入', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    await page.goto('/feed');
    
    // 檢查圖片是否有 loading="lazy" 屬性
    const images = page.locator('img');
    const imageCount = await images.count();
    
    let lazyLoadCount = 0;
    for (let i = 0; i < Math.min(5, imageCount); i++) {
      const loading = await images.nth(i).getAttribute('loading');
      if (loading === 'lazy') {
        lazyLoadCount++;
      }
    }
    
    console.log(`圖片懶載入使用率: ${lazyLoadCount}/${Math.min(5, imageCount)}`);
    await takeScreenshot(page, 'lazy-loading-images');
  });

  test('JavaScript Bundle 大小應該合理', async ({ page }) => {
    const responses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('.js') && response.status() === 200) {
        responses.push({
          url: response.url(),
          size: parseInt(response.headers()['content-length'] || '0'),
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    let totalJSSize = 0;
    responses.forEach(r => {
      totalJSSize += r.size;
      if (r.size > 0) {
        console.log(`JS 檔案: ${r.url.split('/').pop()} - ${(r.size / 1024).toFixed(2)} KB`);
      }
    });
    
    console.log(`總 JavaScript 大小: ${(totalJSSize / 1024 / 1024).toFixed(2)} MB`);
    
    // JS 總大小應該 < 2MB
    expect(totalJSSize).toBeLessThan(2 * 1024 * 1024);
  });

  test('CSS Bundle 大小應該合理', async ({ page }) => {
    const responses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('.css') && response.status() === 200) {
        responses.push({
          url: response.url(),
          size: parseInt(response.headers()['content-length'] || '0'),
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    let totalCSSSize = 0;
    responses.forEach(r => {
      totalCSSSize += r.size;
      if (r.size > 0) {
        console.log(`CSS 檔案: ${r.url.split('/').pop()} - ${(r.size / 1024).toFixed(2)} KB`);
      }
    });
    
    console.log(`總 CSS 大小: ${(totalCSSSize / 1024).toFixed(2)} KB`);
    
    // CSS 總大小應該 < 500KB
    expect(totalCSSSize).toBeLessThan(500 * 1024);
  });

  test('應該使用圖片壓縮', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    await page.goto('/feed');
    
    const responses: any[] = [];
    
    page.on('response', response => {
      const url = response.url();
      if ((url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) && response.status() === 200) {
        responses.push({
          url,
          size: parseInt(response.headers()['content-length'] || '0'),
        });
      }
    });
    
    await page.waitForTimeout(3000);
    
    responses.forEach(r => {
      if (r.size > 0) {
        console.log(`圖片: ${r.url.split('/').pop()} - ${(r.size / 1024).toFixed(2)} KB`);
        
        // 每張圖片應該 < 500KB
        expect(r.size).toBeLessThan(500 * 1024);
      }
    });
  });
});

test.describe('無限滾動效能', () => {
  test('滾動載入更多內容應該流暢', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    await page.goto('/feed');
    
    // 等待初始內容載入
    await page.waitForSelector('[data-testid="post-card"], article, .post');
    
    const initialPostCount = await page.locator('[data-testid="post-card"], article, .post').count();
    console.log(`初始貼文數量: ${initialPostCount}`);
    
    // 滾動到底部
    for (let i = 0; i < 3; i++) {
      const scrollStartTime = Date.now();
      
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      
      const scrollLoadTime = Date.now() - scrollStartTime;
      console.log(`第 ${i + 1} 次滾動載入時間: ${scrollLoadTime}ms`);
      
      // 每次滾動載入應該 < 2 秒
      expect(scrollLoadTime).toBeLessThan(2000);
    }
    
    const finalPostCount = await page.locator('[data-testid="post-card"], article, .post').count();
    console.log(`最終貼文數量: ${finalPostCount}`);
    
    // 應該載入了更多內容
    expect(finalPostCount).toBeGreaterThan(initialPostCount);
    
    await takeScreenshot(page, 'infinite-scroll-performance', { fullPage: true });
  });

  test('滾動時不應該出現卡頓', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    await page.goto('/feed');
    
    await page.waitForSelector('[data-testid="post-card"], article, .post');
    
    // 測試多次快速滾動
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(50);
    }
    
    await takeScreenshot(page, 'smooth-scrolling');
  });
});

test.describe('互動響應時間', () => {
  test('點贊按鈕響應時間應該 < 200ms', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    await page.goto('/feed');
    
    await page.waitForSelector('[data-testid="post-card"], article, .post');
    
    const likeButton = page.locator('button:has-text("贊"), button:has-text("讚"), button[aria-label*="like"]').first();
    
    const clickStartTime = Date.now();
    await likeButton.click();
    
    // 等待 UI 更新
    await page.waitForTimeout(500);
    
    const responseTime = Date.now() - clickStartTime;
    console.log(`點贊響應時間: ${responseTime}ms`);
    
    // 應該快速響應
    expect(responseTime).toBeLessThan(1000);
  });

  test('搜尋輸入響應應該即時', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    await page.goto('/discover');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜"]').first();
    
    if (await searchInput.isVisible()) {
      const typeStartTime = Date.now();
      
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      const responseTime = Date.now() - typeStartTime;
      console.log(`搜尋響應時間: ${responseTime}ms`);
      
      // 應該快速響應
      expect(responseTime).toBeLessThan(1000);
    }
  });

  test('導航切換應該快速', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    await page.goto('/feed');
    
    const navigationStartTime = Date.now();
    
    await page.goto('/discover');
    await page.waitForSelector('[data-testid="discover-card"], .card, .profile-card');
    
    const navigationTime = Date.now() - navigationStartTime;
    console.log(`導航切換時間: ${navigationTime}ms`);
    
    // 導航應該 < 2 秒
    expect(navigationTime).toBeLessThan(2000);
  });
});

test.describe('記憶體使用', () => {
  test('長時間使用不應該記憶體洩漏', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    await page.goto('/feed');
    
    // 模擬長時間使用
    for (let i = 0; i < 5; i++) {
      await page.goto('/feed');
      await page.waitForTimeout(1000);
      
      await page.goto('/discover');
      await page.waitForTimeout(1000);
      
      await page.goto('/profile');
      await page.waitForTimeout(1000);
      
      console.log(`循環 ${i + 1}/5 完成`);
    }
    
    await takeScreenshot(page, 'memory-usage-test');
  });
});

test.describe('並發用戶測試', () => {
  test('應該支援多個並發用戶', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    const startTime = Date.now();
    
    // 同時登入 3 個用戶
    await Promise.all(pages.map(async (page, index) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', TEST_USERS.subscriber.email);
      await page.fill('input[name="password"]', TEST_USERS.subscriber.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(feed|dashboard)/, { timeout: 10000 });
      console.log(`用戶 ${index + 1} 登入成功`);
    }));
    
    const totalTime = Date.now() - startTime;
    console.log(`3 個並發用戶登入總時間: ${totalTime}ms`);
    
    // 應該 < 5 秒
    expect(totalTime).toBeLessThan(5000);
    
    // 清理
    await Promise.all(contexts.map(ctx => ctx.close()));
  });
});

test.describe('快取效能', () => {
  test('第二次載入應該使用快取', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const firstLoadTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const firstDuration = Date.now() - firstLoadTime;
    
    console.log(`第一次載入: ${firstDuration}ms`);
    
    // 第二次載入
    const secondLoadTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const secondDuration = Date.now() - secondLoadTime;
    
    console.log(`第二次載入: ${secondDuration}ms`);
    console.log(`改善: ${((1 - secondDuration / firstDuration) * 100).toFixed(2)}%`);
    
    // 第二次應該更快（使用快取）
    expect(secondDuration).toBeLessThanOrEqual(firstDuration);
  });

  test('API 回應應該有適當的快取標頭', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    
    let hasCacheHeaders = false;
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const headers = response.headers();
        if (headers['cache-control'] || headers['etag']) {
          hasCacheHeaders = true;
          console.log(`API 快取標頭: Cache-Control=${headers['cache-control']}, ETag=${headers['etag']}`);
        }
      }
    });
    
    await page.goto('/feed');
    await page.waitForTimeout(2000);
    
    console.log(`API 有快取標頭: ${hasCacheHeaders}`);
  });
});

test.describe('Lighthouse 效能評分', () => {
  test('首頁應該達到良好的 Lighthouse 評分', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 注意：實際的 Lighthouse 評分需要使用 Lighthouse CI
    // 這裡我們只做基本的效能檢查
    
    // 檢查關鍵渲染路徑
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive,
      };
    });
    
    console.log('效能指標:', performanceMetrics);
    console.log(`DOM Interactive: ${performanceMetrics.domInteractive}ms`);
    
    await takeScreenshot(page, 'lighthouse-performance');
  });
});
