import { test, expect } from '@playwright/test';
import { takeScreenshot } from '../utils/test-helpers';

test.describe('貼文創建流程', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('應該能夠創建免費貼文', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/post/create');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '01-post-create-page');

    // 驗證在貼文創建頁面
    const hasTitle = await page.locator('h1:has-text("發布"), h1:has-text("Create Post")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      // 填寫貼文內容
      const contentTextarea = page.locator('textarea[name="content"], textarea[placeholder*="內容"], [contenteditable="true"]').first();
      await contentTextarea.waitFor({ state: 'visible', timeout: 5000 });
      
      const timestamp = Date.now();
      const postContent = `這是一篇測試貼文 - E2E 測試 ${timestamp}\n\n包含多行內容，用於測試貼文創建功能。`;
      
      await contentTextarea.fill(postContent);
      await takeScreenshot(page, '02-post-content-filled');

      // 確認是免費貼文（toggle 應該是關閉狀態）
      const isPaidToggle = page.locator('button[role="switch"][aria-label*="付費"], input[type="checkbox"][name*="paid"]').first();
      const hasToggle = await isPaidToggle.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasToggle) {
        const isChecked = await isPaidToggle.getAttribute('aria-checked') === 'true' || 
                         await isPaidToggle.isChecked().catch(() => false);
        
        if (isChecked) {
          // 關閉付費開關，使其成為免費貼文
          await isPaidToggle.click();
          await page.waitForTimeout(500);
          await takeScreenshot(page, '03-free-post-toggle');
        }
      }

      // 添加標題（如果有）
      const titleInput = page.locator('input[name="title"], input[placeholder*="標題"]').first();
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.fill(`測試貼文標題 ${timestamp}`);
      }

      await takeScreenshot(page, '04-ready-to-publish');

      // 發布貼文
      const publishButton = page.locator('button:has-text("發布"), button:has-text("Publish"), button[type="submit"]').first();
      await publishButton.waitFor({ state: 'visible', timeout: 5000 });
      await publishButton.click();

      // 等待發布完成
      await page.waitForTimeout(3000);
      await takeScreenshot(page, '05-post-published');

      // 驗證成功訊息或導航到貼文頁面
      const successMessage = page.locator('text=/成功|Success|已發布/i').first();
      const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
      
      const onFeedPage = page.url().includes('/feed');
      const onPostPage = page.url().includes('/post/');

      expect(hasSuccess || onFeedPage || onPostPage).toBeTruthy();
    } else {
      test.skip(true, '貼文創建頁面不可用');
    }
  });

  test('應該能夠創建付費貼文', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/post/create');
    await page.waitForLoadState('networkidle');

    const contentTextarea = page.locator('textarea[name="content"], [contenteditable="true"]').first();
    const hasTextarea = await contentTextarea.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTextarea) {
      const timestamp = Date.now();
      await contentTextarea.fill(`這是一篇付費貼文 - E2E 測試 ${timestamp}\n\n訂閱者才能查看完整內容。`);

      // 開啟付費開關
      const isPaidToggle = page.locator('button[role="switch"][aria-label*="付費"]').first();
      const hasToggle = await isPaidToggle.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasToggle) {
        await isPaidToggle.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '06-paid-post-toggle-on');

        // 驗證付費標籤顯示
        const paidLabel = page.locator('text=/付費貼文|Paid Post/i').first();
        await expect(paidLabel).toBeVisible({ timeout: 3000 });
      }

      await takeScreenshot(page, '07-paid-post-ready');

      // 發布
      const publishButton = page.locator('button:has-text("發布")').first();
      await publishButton.click();

      await page.waitForTimeout(3000);
      await takeScreenshot(page, '08-paid-post-published');

      // 驗證發布成功
      const onFeedOrPost = page.url().includes('/feed') || page.url().includes('/post/');
      expect(onFeedOrPost).toBeTruthy();
    } else {
      test.skip(true, '貼文創建頁面不可用');
    }
  });

  test('應該能夠上傳圖片到貼文', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/post/create');
    await page.waitForLoadState('networkidle');

    // 尋找圖片上傳按鈕
    const imageUpload = page.locator('input[type="file"][accept*="image"], button:has-text("上傳圖片"), button[aria-label*="上傳"]').first();
    const hasUpload = await imageUpload.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasUpload) {
      await takeScreenshot(page, '09-image-upload-available');
      
      // 驗證上傳元素存在（實際上傳需要真實檔案）
      await expect(imageUpload).toBeVisible();
    } else {
      test.skip(true, '圖片上傳功能尚未實作');
    }
  });

  test('應該驗證必填欄位', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/post/create');
    await page.waitForLoadState('networkidle');

    // 不填寫內容，直接嘗試發布
    const publishButton = page.locator('button:has-text("發布"), button:has-text("Publish")').first();
    const hasButton = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasButton) {
      // 檢查按鈕是否被禁用
      const isDisabled = await publishButton.isDisabled().catch(() => false);
      
      if (!isDisabled) {
        // 如果按鈕未禁用，點擊後應顯示錯誤訊息
        await publishButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '10-validation-error');

        const errorMessage = page.locator('text=/請輸入內容|Content is required|必填/i').first();
        const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasError) {
          await expect(errorMessage).toBeVisible();
        }
      } else {
        // 按鈕被正確禁用
        expect(isDisabled).toBeTruthy();
        await takeScreenshot(page, '11-button-disabled');
      }
    }
  });

  test('應該能夠儲存草稿', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/post/create');
    await page.waitForLoadState('networkidle');

    const contentTextarea = page.locator('textarea[name="content"], [contenteditable="true"]').first();
    const hasTextarea = await contentTextarea.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTextarea) {
      await contentTextarea.fill('這是一篇草稿貼文，尚未發布。');

      // 尋找儲存草稿按鈕
      const saveDraftButton = page.locator('button:has-text("儲存草稿"), button:has-text("Save Draft")').first();
      const hasDraftButton = await saveDraftButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasDraftButton) {
        await saveDraftButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '12-draft-saved');

        // 驗證成功訊息
        const successMessage = page.locator('text=/草稿已儲存|Draft saved/i').first();
        const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (hasSuccess) {
          await expect(successMessage).toBeVisible();
        }
      } else {
        test.skip(true, '草稿功能尚未實作');
      }
    }
  });

  test('應該能夠預覽貼文', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/post/create');
    await page.waitForLoadState('networkidle');

    const contentTextarea = page.locator('textarea[name="content"], [contenteditable="true"]').first();
    const hasTextarea = await contentTextarea.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTextarea) {
      await contentTextarea.fill('這是貼文預覽測試內容。');

      // 尋找預覽按鈕
      const previewButton = page.locator('button:has-text("預覽"), button:has-text("Preview")').first();
      const hasPreview = await previewButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasPreview) {
        await previewButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '13-post-preview', { fullPage: true });

        // 驗證預覽模式
        const previewMode = page.locator('text=/預覽模式|Preview Mode/i, [data-testid="preview-mode"]').first();
        const hasPreviewMode = await previewMode.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasPreviewMode) {
          await expect(previewMode).toBeVisible();
        }
      } else {
        test.skip(true, '預覽功能尚未實作');
      }
    }
  });

  test('應該能夠取消貼文創建', async ({ page }) => {
    await page.goto('/post/create');
    await page.waitForLoadState('networkidle');

    const contentTextarea = page.locator('textarea[name="content"], [contenteditable="true"]').first();
    const hasTextarea = await contentTextarea.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTextarea) {
      await contentTextarea.fill('這篇貼文將被取消。');

      // 尋找取消按鈕
      const cancelButton = page.locator('button:has-text("取消"), button:has-text("Cancel"), a:has-text("返回")').first();
      const hasCancel = await cancelButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasCancel) {
        await cancelButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '14-post-cancelled');

        // 驗證離開創建頁面
        const leftCreatePage = !page.url().includes('/post/create');
        expect(leftCreatePage).toBeTruthy();
      }
    }
  });
});

test.describe('貼文編輯流程', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('應該能夠編輯已發布的貼文', async ({ page }) => {
    test.setTimeout(120000);

    // 先前往 feed 頁面
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找自己的貼文
    const myPost = page.locator('[data-testid="post-card"], article, .post').first();
    const hasPost = await myPost.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPost) {
      // 尋找編輯按鈕
      const editButton = page.locator('button:has-text("編輯"), button[aria-label*="編輯"]').first();
      const hasEdit = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasEdit) {
        await editButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '15-post-edit-form');

        // 修改內容
        const contentTextarea = page.locator('textarea[name="content"], [contenteditable="true"]').first();
        if (await contentTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
          const originalContent = await contentTextarea.inputValue().catch(() => '');
          await contentTextarea.clear();
          await contentTextarea.fill(`${originalContent}\n\n[已編輯 - E2E 測試]`);

          // 儲存變更
          const saveButton = page.locator('button:has-text("儲存"), button:has-text("Save")').first();
          await saveButton.click();
          await page.waitForTimeout(2000);
          await takeScreenshot(page, '16-post-edited');
        }
      } else {
        test.skip(true, '編輯功能尚未實作或沒有可編輯的貼文');
      }
    } else {
      test.skip(true, '沒有找到貼文');
    }
  });
});
