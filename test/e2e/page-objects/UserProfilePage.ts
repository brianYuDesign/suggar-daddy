import { Page, Locator, expect } from '@playwright/test';

/**
 * 用戶個人資料頁面對象模型
 */
export class UserProfilePage {
  readonly page: Page;
  readonly url: string;
  
  // 個人資料卡片
  readonly profileHeader: Locator;
  readonly avatarImage: Locator;
  readonly displayName: Locator;
  readonly bio: Locator;
  readonly location: Locator;
  readonly verifiedBadge: Locator;
  
  // 統計數據
  readonly followersCount: Locator;
  readonly followingCount: Locator;
  readonly postsCount: Locator;
  
  // 操作按鈕
  readonly editProfileButton: Locator;
  readonly followButton: Locator;
  readonly messageButton: Locator;
  readonly tipButton: Locator;
  readonly shareButton: Locator;
  
  // 標籤頁
  readonly postsTab: Locator;
  readonly mediaTab: Locator;
  readonly aboutTab: Locator;
  
  // 設置
  readonly settingsButton: Locator;
  readonly logoutButton: Locator;
  
  // 編輯表單
  readonly editModal: Locator;
  readonly bioInput: Locator;
  readonly locationInput: Locator;
  readonly avatarUploadButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page, baseURL: string = 'http://localhost:4200') {
    this.page = page;
    this.url = `${baseURL}/profile`;
    
    // 個人資料元素
    this.profileHeader = page.locator('[data-testid="profile-header"]').or(page.locator('.profile-header'));
    this.avatarImage = page.locator('[data-testid="avatar"]').or(page.locator('img[alt*="頭像"]'));
    this.displayName = page.locator('[data-testid="display-name"]').or(page.locator('h1').first());
    this.bio = page.locator('[data-testid="bio"]').or(page.locator('.bio'));
    this.location = page.locator('[data-testid="location"]').or(page.locator('.location'));
    this.verifiedBadge = page.locator('[data-testid="verified-badge"]').or(page.locator('.verified'));
    
    // 統計數據
    this.followersCount = page.locator('[data-testid="followers-count"]');
    this.followingCount = page.locator('[data-testid="following-count"]');
    this.postsCount = page.locator('[data-testid="posts-count"]');
    
    // 操作按鈕
    this.editProfileButton = page.locator('button:has-text("編輯個人資料")');
    this.followButton = page.locator('button:has-text("追蹤"), button:has-text("已追蹤")');
    this.messageButton = page.locator('button:has-text("發送訊息")');
    this.tipButton = page.locator('button:has-text("打賞")');
    this.shareButton = page.locator('button[aria-label="分享"]');
    
    // 標籤頁
    this.postsTab = page.locator('button[role="tab"]:has-text("貼文")');
    this.mediaTab = page.locator('button[role="tab"]:has-text("媒體")');
    this.aboutTab = page.locator('button[role="tab"]:has-text("關於")');
    
    // 設置
    this.settingsButton = page.locator('a[href="/settings"]');
    this.logoutButton = page.locator('button:has-text("登出")');
    
    // 編輯表單
    this.editModal = page.locator('[role="dialog"]');
    this.bioInput = page.locator('textarea[name="bio"]');
    this.locationInput = page.locator('input[name="location"]');
    this.avatarUploadButton = page.locator('input[type="file"][accept*="image"]');
    this.saveButton = page.locator('button:has-text("儲存")');
    this.cancelButton = page.locator('button:has-text("取消")');
  }

  /**
   * 導航到個人資料頁面
   */
  async goto(userId?: string) {
    const url = userId ? `${this.url}/${userId}` : this.url;
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * 等待頁面加載完成
   */
  async waitForPageLoad() {
    await expect(this.profileHeader).toBeVisible({ timeout: 10000 });
  }

  /**
   * 點擊編輯個人資料
   */
  async clickEditProfile() {
    await this.editProfileButton.click();
    await expect(this.editModal).toBeVisible();
  }

  /**
   * 更新個人資料
   */
  async updateProfile(data: {
    bio?: string;
    location?: string;
  }) {
    await this.clickEditProfile();
    
    if (data.bio !== undefined) {
      await this.bioInput.fill(data.bio);
    }
    
    if (data.location !== undefined) {
      await this.locationInput.fill(data.location);
    }
    
    await this.saveButton.click();
    
    // 等待保存完成
    await expect(this.editModal).toBeHidden();
  }

  /**
   * 上傳頭像
   */
  async uploadAvatar(filePath: string) {
    await this.clickEditProfile();
    await this.avatarUploadButton.setInputFiles(filePath);
    await this.saveButton.click();
    await expect(this.editModal).toBeHidden();
  }

  /**
   * 追蹤/取消追蹤用戶
   */
  async toggleFollow() {
    const buttonText = await this.followButton.textContent();
    await this.followButton.click();
    
    // 等待按鈕文字改變
    await expect(this.followButton).not.toContainText(buttonText || '');
  }

  /**
   * 發送訊息
   */
  async sendMessage() {
    await this.messageButton.click();
    await this.page.waitForURL(/\/messages/);
  }

  /**
   * 打賞用戶
   */
  async tipUser(amount?: number) {
    await this.tipButton.click();
    
    // 等待打賞對話框出現
    const tipModal = this.page.locator('[role="dialog"]:has-text("打賞")');
    await expect(tipModal).toBeVisible();
    
    if (amount) {
      const amountInput = this.page.locator('input[name="amount"]');
      await amountInput.fill(amount.toString());
    }
    
    const confirmButton = this.page.locator('button:has-text("確認打賞")');
    await confirmButton.click();
  }

  /**
   * 切換到貼文標籤
   */
  async switchToPostsTab() {
    await this.postsTab.click();
  }

  /**
   * 切換到媒體標籤
   */
  async switchToMediaTab() {
    await this.mediaTab.click();
  }

  /**
   * 切換到關於標籤
   */
  async switchToAboutTab() {
    await this.aboutTab.click();
  }

  /**
   * 獲取追蹤者數量
   */
  async getFollowersCount(): Promise<number> {
    const text = await this.followersCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * 獲取追蹤中數量
   */
  async getFollowingCount(): Promise<number> {
    const text = await this.followingCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * 獲取貼文數量
   */
  async getPostsCount(): Promise<number> {
    const text = await this.postsCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * 登出
   */
  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL(/\/login/);
  }

  /**
   * 驗證個人資料已顯示
   */
  async expectProfileVisible() {
    await expect(this.profileHeader).toBeVisible();
    await expect(this.displayName).toBeVisible();
  }

  /**
   * 驗證是否為已驗證用戶
   */
  async expectVerified() {
    await expect(this.verifiedBadge).toBeVisible();
  }

  /**
   * 驗證生物描述內容
   */
  async expectBio(text: string) {
    await expect(this.bio).toContainText(text);
  }

  /**
   * 驗證位置資訊
   */
  async expectLocation(location: string) {
    await expect(this.location).toContainText(location);
  }
}
