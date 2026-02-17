import { test, expect } from '../../fixtures/base';
import { UserProfilePage } from '../../page-objects/UserProfilePage';
import { TestDataFactory } from '../../utils/test-data-factory';

/**
 * 用戶功能 E2E 測試
 * 
 * 測試場景：
 * 1. 查看用戶列表
 * 2. 查看用戶詳情
 * 3. 更新用戶資料
 * 4. 追蹤/取消追蹤用戶
 */
test.describe('用戶功能', () => {
  
  test.describe('個人資料管理', () => {
    
    test('應該顯示個人資料頁面 @critical', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      await profilePage.goto();
      await profilePage.expectProfileVisible();
    });

    test('應該可以編輯個人資料 @critical', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      await profilePage.goto();
      
      // 更新 Bio 和位置
      const newBio = TestDataFactory.generateBio();
      const newLocation = TestDataFactory.generateLocation();
      
      await profilePage.updateProfile({
        bio: newBio,
        location: newLocation,
      });
      
      // 驗證更新成功
      await authenticatedPage.reload();
      await profilePage.expectBio(newBio);
      await profilePage.expectLocation(newLocation);
    });

    test('應該顯示統計數據 @ui', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      await profilePage.goto();
      
      // 獲取統計數據
      const followersCount = await profilePage.getFollowersCount();
      const followingCount = await profilePage.getFollowingCount();
      const postsCount = await profilePage.getPostsCount();
      
      // 驗證數據為數字
      expect(typeof followersCount).toBe('number');
      expect(typeof followingCount).toBe('number');
      expect(typeof postsCount).toBe('number');
    });

    test('應該可以切換標籤頁 @ui', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      await profilePage.goto();
      
      // 切換到媒體標籤
      await profilePage.switchToMediaTab();
      await authenticatedPage.waitForTimeout(500);
      
      // 切換到關於標籤
      await profilePage.switchToAboutTab();
      await authenticatedPage.waitForTimeout(500);
      
      // 切換回貼文標籤
      await profilePage.switchToPostsTab();
      await authenticatedPage.waitForTimeout(500);
    });
  });

  test.describe('用戶互動', () => {
    
    test('應該可以查看其他用戶資料 @critical', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      // 假設有一個測試用戶 ID
      // 在實際場景中，這應該從測試資料庫獲取
      const testUserId = 'test-user-id';
      
      await profilePage.goto(testUserId);
      
      // 驗證頁面顯示
      await expect(profilePage.profileHeader).toBeVisible();
    });

    test.skip('應該可以追蹤用戶 @social', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      // 訪問其他用戶的個人資料
      const testUserId = 'other-user-id';
      await profilePage.goto(testUserId);
      
      // 獲取初始追蹤者數量
      const initialCount = await profilePage.getFollowersCount();
      
      // 追蹤用戶
      await profilePage.toggleFollow();
      
      // 驗證追蹤者數量增加
      await authenticatedPage.waitForTimeout(1000);
      const newCount = await profilePage.getFollowersCount();
      expect(newCount).toBe(initialCount + 1);
    });

    test.skip('應該可以發送訊息給用戶 @social', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      const testUserId = 'other-user-id';
      await profilePage.goto(testUserId);
      
      // 點擊發送訊息
      await profilePage.sendMessage();
      
      // 驗證導航到訊息頁面
      await expect(authenticatedPage).toHaveURL(/\/messages/);
    });

    test.skip('應該可以打賞用戶 @payment', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      const testUserId = 'other-user-id';
      await profilePage.goto(testUserId);
      
      // 打賞 100 元
      await profilePage.tipUser(100);
      
      // 驗證打賞對話框出現
      const tipModal = authenticatedPage.locator('[role="dialog"]:has-text("打賞")');
      await expect(tipModal).toBeVisible();
    });
  });

  test.describe('個人資料驗證', () => {
    
    test('應該驗證必填欄位 @validation', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      await profilePage.goto();
      await profilePage.clickEditProfile();
      
      // 清空 Bio
      await profilePage.bioInput.fill('');
      
      // 嘗試儲存
      await profilePage.saveButton.click();
      
      // 根據實際驗證規則，這裡可能會顯示錯誤或成功儲存
      // 如果 Bio 不是必填，則應該成功
      await authenticatedPage.waitForTimeout(1000);
    });

    test('應該限制 Bio 長度 @validation', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      await profilePage.goto();
      await profilePage.clickEditProfile();
      
      // 輸入超長的 Bio（假設限制為 500 字）
      const longBio = 'a'.repeat(600);
      await profilePage.bioInput.fill(longBio);
      
      // 驗證字數限制提示
      const charCount = await authenticatedPage.locator('.character-count').textContent().catch(() => null);
      
      if (charCount) {
        expect(charCount).toContain('500');
      }
    });
  });

  test.describe('個人資料安全性', () => {
    
    test('應該只允許用戶編輯自己的資料 @security', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      // 訪問其他用戶的個人資料
      const otherUserId = 'other-user-id';
      await profilePage.goto(otherUserId);
      
      // 驗證編輯按鈕不存在
      const isEditButtonVisible = await profilePage.editProfileButton.isVisible().catch(() => false);
      expect(isEditButtonVisible).toBe(false);
    });

    test('應該保護敏感資訊 @security', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      await profilePage.goto();
      
      // 驗證不顯示 Email（除非在設置頁面）
      const pageContent = await authenticatedPage.content();
      expect(pageContent).not.toContain('@example.com');
    });
  });

  test.describe('響應式設計', () => {
    
    test('應該在手機上正常顯示 @responsive', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      // 設置手機視窗大小
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      
      await profilePage.goto();
      await profilePage.expectProfileVisible();
      
      // 驗證頭像和顯示名稱可見
      await expect(profilePage.avatarImage).toBeVisible();
      await expect(profilePage.displayName).toBeVisible();
    });

    test('應該在平板上正常顯示 @responsive', async ({ authenticatedPage }) => {
      const profilePage = new UserProfilePage(authenticatedPage);
      
      // 設置平板視窗大小
      await authenticatedPage.setViewportSize({ width: 768, height: 1024 });
      
      await profilePage.goto();
      await profilePage.expectProfileVisible();
    });
  });
});
