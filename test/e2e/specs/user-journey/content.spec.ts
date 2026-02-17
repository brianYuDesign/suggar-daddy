import { test, expect } from '../../fixtures/base';
import { FeedPage } from '../../page-objects/FeedPage';
import { PostDetailPage } from '../../page-objects/PostDetailPage';
import { TestDataFactory } from '../../utils/test-data-factory';

/**
 * 內容功能 E2E 測試
 * 
 * 測試場景：
 * 1. 瀏覽貼文
 * 2. 創建貼文
 * 3. 互動（喜歡、評論、分享）
 * 4. 購買付費內容
 */
test.describe('內容功能', () => {
  
  test.describe('瀏覽貼文', () => {
    
    test('應該顯示動態 Feed @critical', async ({ authenticatedPage }) => {
      const feedPage = new FeedPage(authenticatedPage);
      
      await feedPage.goto();
      
      // 驗證 Feed 頁面顯示
      await feedPage.expectFeedVisible();
    });

    test('應該載入貼文列表 @critical', async ({ authenticatedPage }) => {
      const feedPage = new FeedPage(authenticatedPage);
      
      await feedPage.goto();
      
      // 等待貼文載入
      await authenticatedPage.waitForTimeout(2000);
      
      // 檢查是否有貼文或空狀態
      const hasPost = await feedPage.postCards.first().isVisible().catch(() => false);
      const hasEmptyState = await feedPage.emptyState.isVisible().catch(() => false);
      
      // 應該顯示貼文或空狀態其中之一
      expect(hasPost || hasEmptyState).toBe(true);
    });

    test('應該可以點擊貼文查看詳情 @navigation', async ({ authenticatedPage }) => {
      const feedPage = new FeedPage(authenticatedPage);
      
      await feedPage.goto();
      
      // 等待貼文載入
      await authenticatedPage.waitForTimeout(2000);
      
      // 點擊第一篇貼文（如果存在）
      const firstPost = feedPage.postCards.first();
      const isVisible = await firstPost.isVisible().catch(() => false);
      
      if (isVisible) {
        await firstPost.click();
        
        // 驗證導航到貼文詳情頁
        await expect(authenticatedPage).toHaveURL(/\/post\//);
      }
    });

    test('應該顯示歡迎卡片 @ui', async ({ authenticatedPage }) => {
      const feedPage = new FeedPage(authenticatedPage);
      
      await feedPage.goto();
      
      // 驗證歡迎卡片
      await expect(feedPage.welcomeCard).toBeVisible();
    });

    test.skip('應該顯示限時動態 @ui', async ({ authenticatedPage }) => {
      const feedPage = new FeedPage(authenticatedPage);
      
      await feedPage.goto();
      
      // 驗證限時動態列
      const isVisible = await feedPage.storiesBar.isVisible().catch(() => false);
      
      // 限時動態是可選功能
      if (isVisible) {
        await expect(feedPage.storiesBar).toBeVisible();
      }
    });
  });

  test.describe('創建貼文', () => {
    
    test('應該可以導航到創建貼文頁面 @critical', async ({ authenticatedPage }) => {
      const feedPage = new FeedPage(authenticatedPage);
      
      await feedPage.goto();
      
      // 點擊創建貼文按鈕
      const createButton = feedPage.createPostButton;
      const isVisible = await createButton.isVisible().catch(() => false);
      
      if (isVisible) {
        await createButton.click();
        
        // 驗證導航
        await expect(authenticatedPage).toHaveURL(/\/post\/create/);
      }
    });

    test.skip('應該可以創建文字貼文 @critical', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/create');
      
      // 生成測試貼文內容
      const postContent = TestDataFactory.generatePost();
      
      // 填寫內容
      const contentInput = authenticatedPage.locator('textarea[name="content"]');
      await contentInput.fill(postContent.content);
      
      // 發布貼文
      const publishButton = authenticatedPage.locator('button:has-text("發布")');
      await publishButton.click();
      
      // 等待發布完成
      await authenticatedPage.waitForTimeout(2000);
      
      // 驗證導航回 Feed 或顯示成功訊息
      const currentUrl = authenticatedPage.url();
      expect(currentUrl.includes('/feed') || currentUrl.includes('/post/')).toBe(true);
    });

    test.skip('應該可以上傳圖片 @media', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/create');
      
      // 上傳測試圖片
      const fileInput = authenticatedPage.locator('input[type="file"][accept*="image"]');
      
      // 創建測試圖片文件
      // 注意：實際測試中需要準備真實的測試圖片
      await fileInput.setInputFiles({
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from(TestDataFactory.generateTestImageBase64().split(',')[1], 'base64'),
      });
      
      // 等待上傳
      await authenticatedPage.waitForTimeout(2000);
      
      // 驗證圖片預覽
      const imagePreview = authenticatedPage.locator('img[alt*="preview"], .image-preview');
      await expect(imagePreview).toBeVisible();
    });

    test.skip('應該驗證內容長度 @validation', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/create');
      
      // 輸入空內容
      const contentInput = authenticatedPage.locator('textarea[name="content"]');
      await contentInput.fill('');
      
      // 嘗試發布
      const publishButton = authenticatedPage.locator('button:has-text("發布")');
      await publishButton.click();
      
      // 驗證錯誤訊息
      const errorMessage = authenticatedPage.locator('.error-message, [role="alert"]');
      await expect(errorMessage).toBeVisible();
    });

    test.skip('應該可以設置貼文為付費內容 @premium', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/create');
      
      // 填寫內容
      const postContent = TestDataFactory.generatePost();
      const contentInput = authenticatedPage.locator('textarea[name="content"]');
      await contentInput.fill(postContent.content);
      
      // 啟用付費內容
      const premiumToggle = authenticatedPage.locator('input[type="checkbox"][name="isPremium"]');
      await premiumToggle.check();
      
      // 設置價格
      const priceInput = authenticatedPage.locator('input[name="price"]');
      await priceInput.fill('100');
      
      // 發布
      const publishButton = authenticatedPage.locator('button:has-text("發布")');
      await publishButton.click();
      
      await authenticatedPage.waitForTimeout(2000);
    });
  });

  test.describe('貼文互動', () => {
    
    test.skip('應該可以喜歡貼文 @interaction', async ({ authenticatedPage }) => {
      const feedPage = new FeedPage(authenticatedPage);
      
      await feedPage.goto();
      await authenticatedPage.waitForTimeout(2000);
      
      // 點擊第一個喜歡按鈕
      const firstLikeButton = feedPage.likeButtons.first();
      const isVisible = await firstLikeButton.isVisible().catch(() => false);
      
      if (isVisible) {
        const beforeText = await firstLikeButton.textContent();
        await firstLikeButton.click();
        
        // 等待狀態更新
        await authenticatedPage.waitForTimeout(500);
        
        const afterText = await firstLikeButton.textContent();
        expect(afterText).not.toBe(beforeText);
      }
    });

    test.skip('應該可以評論貼文 @interaction', async ({ authenticatedPage }) => {
      // 導航到貼文詳情頁
      await authenticatedPage.goto('/post/test-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 發表評論
      const comment = TestDataFactory.generateComment();
      await postDetailPage.postComment(comment.content);
      
      // 驗證評論出現
      await authenticatedPage.waitForTimeout(1000);
      const commentsCount = await postDetailPage.getCommentsCount();
      expect(commentsCount).toBeGreaterThan(0);
    });

    test.skip('應該可以分享貼文 @interaction', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/test-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 點擊分享
      await postDetailPage.sharePost();
      
      // 驗證分享對話框
      const shareDialog = authenticatedPage.locator('[role="dialog"]:has-text("分享")');
      await expect(shareDialog).toBeVisible();
    });

    test.skip('應該可以收藏貼文 @interaction', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/test-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 收藏貼文
      await postDetailPage.bookmarkPost();
      
      // 驗證收藏狀態改變
      await authenticatedPage.waitForTimeout(500);
    });

    test.skip('應該可以打賞作者 @interaction @payment', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/test-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 打賞
      await postDetailPage.tipAuthor(50);
      
      // 驗證打賞流程啟動
      await authenticatedPage.waitForTimeout(1000);
    });
  });

  test.describe('付費內容', () => {
    
    test.skip('應該顯示鎖定的付費內容 @premium', async ({ authenticatedPage }) => {
      // 導航到付費貼文
      await authenticatedPage.goto('/post/premium-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 驗證內容已鎖定
      await postDetailPage.expectContentLocked();
    });

    test.skip('應該顯示內容價格 @premium', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/premium-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 驗證價格標籤
      await expect(postDetailPage.priceTag).toBeVisible();
      
      // 獲取價格
      const priceText = await postDetailPage.priceTag.textContent();
      expect(priceText).toMatch(/\d+/); // 包含數字
    });

    test.skip('應該可以購買付費內容 @premium @payment', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/premium-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 點擊解鎖
      await postDetailPage.unlockContent();
      
      // 驗證導航到付款頁面或顯示付款對話框
      await authenticatedPage.waitForTimeout(2000);
      
      const currentUrl = authenticatedPage.url();
      const hasPaymentModal = await authenticatedPage.locator('[role="dialog"]:has-text("付款")').isVisible().catch(() => false);
      
      expect(currentUrl.includes('/payment') || hasPaymentModal).toBe(true);
    });

    test.skip('已購買的內容應該直接顯示 @premium', async ({ authenticatedPage }) => {
      // 假設用戶已購買此內容
      await authenticatedPage.goto('/post/purchased-premium-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 驗證內容未鎖定
      const isLocked = await postDetailPage.lockedContent.isVisible().catch(() => false);
      expect(isLocked).toBe(false);
      
      // 驗證內容可見
      await postDetailPage.expectPostVisible();
    });
  });

  test.describe('貼文管理', () => {
    
    test.skip('應該可以編輯自己的貼文 @edit', async ({ authenticatedPage }) => {
      // 導航到自己的貼文
      await authenticatedPage.goto('/post/my-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 編輯貼文
      const newContent = 'Updated content ' + Date.now();
      await postDetailPage.editPost(newContent);
      
      // 驗證內容已更新
      await authenticatedPage.waitForTimeout(1000);
      const content = await postDetailPage.getPostContent();
      expect(content).toContain('Updated');
    });

    test.skip('應該可以刪除自己的貼文 @delete', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/my-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 刪除貼文
      await postDetailPage.deletePost();
      
      // 驗證導航回 Feed
      await expect(authenticatedPage).toHaveURL(/\/feed/);
    });

    test.skip('應該可以檢舉不當內容 @report', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/other-user-post-id');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 檢舉貼文
      await postDetailPage.reportPost('spam');
      
      // 驗證檢舉成功
      await authenticatedPage.waitForTimeout(1000);
      
      const successMessage = authenticatedPage.locator('text=檢舉已提交|Report submitted');
      await expect(successMessage).toBeVisible();
    });
  });

  test.describe('多媒體內容', () => {
    
    test.skip('應該可以查看圖片 @media', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/post-with-images');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 驗證圖片已載入
      await postDetailPage.expectImagesLoaded();
    });

    test.skip('應該可以播放影片 @media', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/post-with-video');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 驗證影片元素存在
      await expect(postDetailPage.postVideo).toBeVisible();
      
      // 點擊播放
      await postDetailPage.postVideo.click();
      
      // 驗證影片正在播放
      const isPlaying = await postDetailPage.postVideo.evaluate(
        (video: HTMLVideoElement) => !video.paused
      );
      
      expect(isPlaying).toBe(true);
    });

    test.skip('應該可以放大圖片 @media', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/post-with-images');
      
      const postDetailPage = new PostDetailPage(authenticatedPage);
      
      // 點擊第一張圖片
      const firstImage = postDetailPage.postImages.first();
      await firstImage.click();
      
      // 驗證圖片燈箱出現
      const lightbox = authenticatedPage.locator('[data-testid="image-lightbox"], .lightbox');
      await expect(lightbox).toBeVisible();
    });
  });

  test.describe('內容搜尋和篩選', () => {
    
    test.skip('應該可以搜尋貼文 @search', async ({ authenticatedPage }) => {
      const feedPage = new FeedPage(authenticatedPage);
      
      await feedPage.goto();
      
      // 輸入搜尋關鍵字
      const searchInput = authenticatedPage.locator('input[placeholder*="搜尋"]');
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // 等待搜尋結果
      await authenticatedPage.waitForTimeout(2000);
      
      // 驗證有搜尋結果或空狀態
      const hasResults = await feedPage.postCards.first().isVisible().catch(() => false);
      const hasEmptyState = await feedPage.emptyState.isVisible().catch(() => false);
      
      expect(hasResults || hasEmptyState).toBe(true);
    });

    test.skip('應該可以按標籤篩選 @filter', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/feed?tag=travel');
      
      // 等待貼文載入
      await authenticatedPage.waitForTimeout(2000);
      
      // 驗證頁面顯示
      const feedPage = new FeedPage(authenticatedPage);
      await expect(feedPage.welcomeCard).toBeVisible();
    });
  });
});
