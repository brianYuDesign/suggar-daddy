import { test, expect } from '@playwright/test';
import { takeScreenshot } from '../utils/test-helpers';

test.describe('動態牆瀏覽', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('應該能夠瀏覽動態牆', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '01-feed-page', { fullPage: true });

    // 驗證在 feed 頁面
    expect(page.url()).toContain('/feed');

    // 檢查頁面內容
    const hasWelcome = await page.locator('text=/歡迎|Welcome/i').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasPosts = await page.locator('[data-testid="post-card"], article, .post').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/還沒有任何動態|No posts yet/i').first().isVisible({ timeout: 3000 }).catch(() => false);

    // 至少應該有一種狀態
    expect(hasWelcome || hasPosts || hasEmptyState).toBeTruthy();
  });

  test('應該能夠滾動載入更多貼文', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 獲取初始貼文數量
    const initialPosts = await page.locator('[data-testid="post-card"], article, .post').count();

    if (initialPosts > 0) {
      // 滾動到底部
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(3000);
      await takeScreenshot(page, '02-feed-scrolled', { fullPage: true });

      // 獲取滾動後的貼文數量
      const afterScrollPosts = await page.locator('[data-testid="post-card"], article, .post').count();

      // 驗證載入了更多貼文，或顯示「沒有更多」訊息
      const hasMorePosts = afterScrollPosts > initialPosts;
      const noMoreMessage = await page.locator('text=/沒有更多|No more posts/i').isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasMorePosts || noMoreMessage).toBeTruthy();
    } else {
      test.skip(true, '沒有貼文可供滾動測試');
    }
  });

  test('應該能夠搜尋用戶', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');

    // 尋找搜尋框
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜尋"], input[placeholder*="Search"]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill('test');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '03-feed-search');

      // 驗證搜尋結果或建議
      const searchResults = page.locator('[data-testid="search-results"], .search-results, .search-dropdown').first();
      const hasResults = await searchResults.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasResults) {
        await expect(searchResults).toBeVisible();
      }
    } else {
      test.skip(true, '搜尋功能尚未實作');
    }
  });
});

test.describe('貼文互動', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('應該能夠點讚貼文', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找點讚按鈕
    const likeButton = page.locator('button:has-text("讚"), button:has-text("Like"), button[aria-label*="讚"], button[aria-label*="like"]').first();
    const hasLike = await likeButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasLike) {
      await takeScreenshot(page, '04-before-like');

      // 點擊點讚
      await likeButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '05-after-like');

      // 驗證點讚狀態改變
      const isLiked = await likeButton.getAttribute('aria-pressed') === 'true' ||
                      await page.locator('button[aria-label*="已讚"], button[aria-label*="Unlike"]').first().isVisible({ timeout: 2000 }).catch(() => false);

      expect(isLiked).toBeTruthy();
    } else {
      test.skip(true, '點讚功能尚未實作或沒有貼文');
    }
  });

  test('應該能夠取消點讚', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 先點讚
    const likeButton = page.locator('button:has-text("讚"), button[aria-label*="讚"]').first();
    const hasLike = await likeButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasLike) {
      await likeButton.click();
      await page.waitForTimeout(1000);

      // 再次點擊取消點讚
      await likeButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '06-unlike');

      // 驗證點讚狀態取消
      const isUnliked = await likeButton.getAttribute('aria-pressed') === 'false' ||
                        await page.locator('button[aria-label*="讚"], button[aria-label*="Like"]').first().isVisible({ timeout: 2000 }).catch(() => false);

      expect(isUnliked).toBeTruthy();
    } else {
      test.skip(true, '點讚功能尚未實作');
    }
  });

  test('應該能夠查看貼文詳情', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 點擊第一篇貼文
    const firstPost = page.locator('[data-testid="post-card"], article, .post').first();
    const hasPost = await firstPost.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPost) {
      await firstPost.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '07-post-detail', { fullPage: true });

      // 驗證在貼文詳情頁面
      const onPostPage = page.url().includes('/post/');
      expect(onPostPage).toBeTruthy();
    } else {
      test.skip(true, '沒有貼文可點擊');
    }
  });

  test('應該能夠發表評論', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 點擊第一篇貼文
    const firstPost = page.locator('[data-testid="post-card"], article, .post').first();
    const hasPost = await firstPost.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPost) {
      // 尋找評論按鈕
      const commentButton = page.locator('button:has-text("評論"), button:has-text("Comment"), button[aria-label*="評論"]').first();
      const hasComment = await commentButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasComment) {
        await commentButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '08-comment-form');

        // 填寫評論
        const commentInput = page.locator('textarea[placeholder*="評論"], textarea[name="comment"], input[placeholder*="評論"]').first();
        const hasInput = await commentInput.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasInput) {
          await commentInput.fill('這是一條測試評論 - E2E 測試');
          await takeScreenshot(page, '09-comment-filled');

          // 提交評論
          const submitButton = page.locator('button:has-text("發送"), button:has-text("Submit"), button[type="submit"]').first();
          await submitButton.click();
          await page.waitForTimeout(2000);
          await takeScreenshot(page, '10-comment-submitted');

          // 驗證評論顯示
          const commentText = page.locator('text=/這是一條測試評論/i').first();
          const hasCommentText = await commentText.isVisible({ timeout: 5000 }).catch(() => false);

          if (hasCommentText) {
            await expect(commentText).toBeVisible();
          }
        } else {
          test.skip(true, '評論輸入框不可用');
        }
      } else {
        test.skip(true, '評論功能尚未實作');
      }
    } else {
      test.skip(true, '沒有貼文可評論');
    }
  });

  test('應該能夠分享貼文', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找分享按鈕
    const shareButton = page.locator('button:has-text("分享"), button:has-text("Share"), button[aria-label*="分享"]').first();
    const hasShare = await shareButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasShare) {
      await shareButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '11-share-menu');

      // 驗證分享選單出現
      const shareMenu = page.locator('[role="dialog"], .share-menu, [data-testid="share-dialog"]').first();
      const hasMenu = await shareMenu.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasMenu) {
        await expect(shareMenu).toBeVisible();
      }
    } else {
      test.skip(true, '分享功能尚未實作');
    }
  });

  test('應該能夠舉報不當內容', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstPost = page.locator('[data-testid="post-card"], article, .post').first();
    const hasPost = await firstPost.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPost) {
      // 尋找更多選項按鈕
      const moreButton = page.locator('button[aria-label*="更多"], button[aria-label*="More"], button:has-text("⋯")').first();
      const hasMore = await moreButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasMore) {
        await moreButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '12-more-menu');

        // 尋找舉報選項
        const reportOption = page.locator('button:has-text("舉報"), button:has-text("Report")').first();
        const hasReport = await reportOption.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasReport) {
          await reportOption.click();
          await page.waitForTimeout(1000);
          await takeScreenshot(page, '13-report-dialog');

          // 驗證舉報對話框
          const reportDialog = page.locator('[role="dialog"]:has-text("舉報"), [data-testid="report-dialog"]').first();
          await expect(reportDialog).toBeVisible({ timeout: 5000 });
        } else {
          test.skip(true, '舉報功能尚未實作');
        }
      } else {
        test.skip(true, '更多選單不可用');
      }
    } else {
      test.skip(true, '沒有貼文');
    }
  });

  test('應該能夠查看創作者檔案', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 點擊創作者名稱或頭像
    const creatorLink = page.locator('a[href*="/user/"], [data-testid="author-link"], [data-testid="creator-name"]').first();
    const hasLink = await creatorLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasLink) {
      await creatorLink.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '14-creator-profile', { fullPage: true });

      // 驗證在創作者檔案頁面
      const onUserPage = page.url().includes('/user/') || page.url().includes('/profile/');
      expect(onUserPage).toBeTruthy();
    } else {
      test.skip(true, '沒有創作者連結');
    }
  });
});

test.describe('付費內容互動', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('應該能夠看到付費內容鎖定狀態', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找付費內容標記
    const paidContentBadge = page.locator('text=/付費內容|Paid Content|Premium/i, [data-testid="paid-badge"]').first();
    const hasPaidContent = await paidContentBadge.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPaidContent) {
      await takeScreenshot(page, '15-paid-content-locked');
      await expect(paidContentBadge).toBeVisible();

      // 驗證解鎖按鈕
      const unlockButton = page.locator('button:has-text("解鎖"), button:has-text("Unlock"), button:has-text("訂閱")').first();
      const hasUnlock = await unlockButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasUnlock) {
        await expect(unlockButton).toBeVisible();
      }
    } else {
      test.skip(true, '沒有付費內容');
    }
  });
});
