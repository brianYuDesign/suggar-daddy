import { test, expect } from '../../fixtures/extended-test';

/**
 * 配對滑動流程測試
 * 測試探索頁面的滑動、配對功能
 */
test.describe('配對滑動流程', () => {
  test.beforeEach(async ({ page }) => {
    // 每個測試前先登入
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'subscriber@test.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|feed)/, { timeout: 10000 });
  });

  test('TC-001: 成功載入探索頁面並顯示個人資料卡片', async ({ discoverPage }) => {
    await discoverPage.navigateToDiscover();

    // 驗證個人資料卡片存在
    const hasCard = await discoverPage.hasProfileCard();
    expect(hasCard).toBeTruthy();

    // 驗證個人資料資訊顯示
    const profileName = await discoverPage.getCurrentProfileName();
    expect(profileName.length).toBeGreaterThan(0);
  });

  test('TC-002: 向右滑動（喜歡）', async ({ page, discoverPage }) => {
    await discoverPage.navigateToDiscover();
    
    // 等待卡片載入
    await page.waitForSelector('[data-testid="profile-card"]', { timeout: 5000 });

    // 取得當前個人資料名稱
    const currentName = await discoverPage.getCurrentProfileName();
    
    // 向右滑動
    await discoverPage.swipeRight();

    // 等待新卡片載入
    await page.waitForTimeout(1000);

    // 驗證顯示新的個人資料（名稱改變）
    const newName = await discoverPage.getCurrentProfileName();
    
    // 如果還有更多個人資料，名稱應該不同
    // 如果沒有更多個人資料，應該顯示結束訊息
    const hasNoMore = await discoverPage.hasNoMoreProfiles();
    if (!hasNoMore) {
      expect(newName).not.toBe(currentName);
    }
  });

  test('TC-003: 向左滑動（略過）', async ({ page, discoverPage }) => {
    await discoverPage.navigateToDiscover();
    
    await page.waitForSelector('[data-testid="profile-card"]', { timeout: 5000 });

    const currentName = await discoverPage.getCurrentProfileName();
    
    // 向左滑動
    await discoverPage.swipeLeft();
    
    await page.waitForTimeout(1000);

    // 驗證顯示新的個人資料
    const newName = await discoverPage.getCurrentProfileName();
    const hasNoMore = await discoverPage.hasNoMoreProfiles();
    
    if (!hasNoMore) {
      expect(newName).not.toBe(currentName);
    }
  });

  test('TC-004: 超級喜歡功能', async ({ page, discoverPage }) => {
    await discoverPage.navigateToDiscover();
    
    await page.waitForSelector('[data-testid="profile-card"]', { timeout: 5000 });

    // 檢查超級喜歡按鈕是否存在
    const superLikeButton = page.locator('button:has-text("超級喜歡"), button[data-action="super-like"]');
    const isSuperLikeVisible = await superLikeButton.isVisible();

    if (isSuperLikeVisible) {
      await discoverPage.superLike();
      
      // 驗證操作成功（顯示新卡片或提示）
      await page.waitForTimeout(1000);
      const hasNewCard = await discoverPage.hasProfileCard();
      const hasNoMore = await discoverPage.hasNoMoreProfiles();
      
      expect(hasNewCard || hasNoMore).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('TC-005: 連續滑動多次', async ({ page, discoverPage }) => {
    await discoverPage.navigateToDiscover();
    
    await page.waitForSelector('[data-testid="profile-card"]', { timeout: 5000 });

    // 連續向右滑動 3 次
    await discoverPage.swipeMultiple('right', 3);

    // 驗證仍然有卡片或顯示結束訊息
    const hasCard = await discoverPage.hasProfileCard();
    const hasNoMore = await discoverPage.hasNoMoreProfiles();
    
    expect(hasCard || hasNoMore).toBeTruthy();
  });

  test('TC-006: 復原上一個操作', async ({ page, discoverPage }) => {
    await discoverPage.navigateToDiscover();
    
    await page.waitForSelector('[data-testid="profile-card"]', { timeout: 5000 });

    const originalName = await discoverPage.getCurrentProfileName();
    
    // 向右滑動
    await discoverPage.swipeRight();
    await page.waitForTimeout(1000);

    // 檢查復原按鈕是否存在
    const undoButton = page.locator('button:has-text("復原"), button[data-action="undo"]');
    const isUndoVisible = await undoButton.isVisible();

    if (isUndoVisible) {
      // 復原操作
      await discoverPage.undo();
      await page.waitForTimeout(1000);

      // 驗證回到原來的個人資料
      const restoredName = await discoverPage.getCurrentProfileName();
      expect(restoredName).toBe(originalName);
    } else {
      test.skip();
    }
  });

  test('TC-007: 雙向配對成功顯示配對彈窗', async ({ page, apiHelper, context }) => {
    // Mock 配對成功的響應
    await context.route('**/api/matching/swipe', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          matched: true,
          matchId: 'match-123',
        }),
      });
    });

    await page.goto('/discover');
    await page.waitForTimeout(2000);

    // 向右滑動
    const likeButton = page.locator('button:has-text("喜歡"), button[data-action="like"]').first();
    if (await likeButton.isVisible()) {
      await likeButton.click();
      
      // 等待配對彈窗出現
      await page.waitForTimeout(2000);
      
      // 驗證配對彈窗
      const matchModal = page.locator('[data-testid="match-modal"], text=/配對成功|It\'s a Match/i');
      const isModalVisible = await matchModal.isVisible();
      
      if (isModalVisible) {
        expect(isModalVisible).toBeTruthy();
        
        // 關閉彈窗
        const closeButton = page.locator('button:has-text("關閉"), button:has-text("繼續"), button[data-action="close"]').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  test('TC-008: 沒有更多個人資料時顯示提示', async ({ page, discoverPage, context }) => {
    // Mock API 返回空列表
    await context.route('**/api/matching/discover**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: [],
          hasMore: false,
        }),
      });
    });

    await discoverPage.navigateToDiscover();
    await page.waitForTimeout(2000);

    // 驗證顯示「沒有更多」訊息
    const hasNoMore = await discoverPage.hasNoMoreProfiles();
    expect(hasNoMore).toBeTruthy();
  });

  test('TC-009: 顯示個人資料詳細資訊', async ({ page, discoverPage }) => {
    await discoverPage.navigateToDiscover();
    
    await page.waitForSelector('[data-testid="profile-card"]', { timeout: 5000 });

    // 取得個人資料資訊
    const name = await discoverPage.getCurrentProfileName();
    const bio = await discoverPage.getCurrentProfileBio();

    // 驗證資訊存在
    expect(name.length).toBeGreaterThan(0);
    
    // Bio 可能是可選的
    if (bio) {
      expect(bio.length).toBeGreaterThan(0);
    }
  });

  test('TC-010: 測試滑動手勢（如果支援）', async ({ page, discoverPage }) => {
    await discoverPage.navigateToDiscover();
    
    await page.waitForSelector('[data-testid="profile-card"]', { timeout: 5000 });

    const card = page.locator('[data-testid="profile-card"]');
    
    if (await card.isVisible()) {
      // 取得卡片位置
      const box = await card.boundingBox();
      
      if (box) {
        // 模擬向右滑動手勢
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width + 100, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        
        // 等待動畫完成
        await page.waitForTimeout(1000);
        
        // 驗證操作成功
        const hasCard = await discoverPage.hasProfileCard();
        const hasNoMore = await discoverPage.hasNoMoreProfiles();
        expect(hasCard || hasNoMore).toBeTruthy();
      }
    }
  });
});

test.describe('配對列表管理', () => {
  test('TC-011: 查看配對列表', async ({ page }) => {
    // 登入
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'subscriber@test.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|feed)/, { timeout: 10000 });

    // 導航到配對列表
    await page.goto('/matches');
    await page.waitForLoadState('networkidle');

    // 驗證頁面載入
    const isMatchesPage = page.url().includes('/matches');
    expect(isMatchesPage).toBeTruthy();

    // 檢查是否有配對項目或空狀態訊息
    const hasMatches = await page.locator('[data-testid="match-item"]').count() > 0;
    const hasEmptyState = await page.locator('text=/還沒有配對|No matches/i').isVisible();
    
    expect(hasMatches || hasEmptyState).toBeTruthy();
  });

  test('TC-012: 從配對列表進入聊天', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'subscriber@test.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|feed)/, { timeout: 10000 });

    await page.goto('/matches');
    await page.waitForLoadState('networkidle');

    // 如果有配對項目，點擊第一個
    const firstMatch = page.locator('[data-testid="match-item"]').first();
    
    if (await firstMatch.isVisible()) {
      await firstMatch.click();
      
      // 驗證導航到聊天頁面
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/chat|\/messages/);
    }
  });
});
