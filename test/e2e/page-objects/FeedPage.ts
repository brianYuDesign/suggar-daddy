import { Page, Locator, expect } from '@playwright/test';

/**
 * Feed 動態頁面對象模型
 */
export class FeedPage {
  readonly page: Page;
  readonly url: string;
  
  // 主要元素
  readonly welcomeCard: Locator;
  readonly storiesBar: Locator;
  readonly createPostButton: Locator;
  readonly postsList: Locator;
  
  // 加載狀態
  readonly loadingSkeleton: Locator;
  readonly emptyState: Locator;
  readonly errorCard: Locator;
  
  // 貼文卡片
  readonly postCards: Locator;
  readonly likeButtons: Locator;
  readonly tipButtons: Locator;
  
  // 導航
  readonly discoverLink: Locator;
  readonly messagesLink: Locator;
  readonly profileLink: Locator;
  readonly notificationsLink: Locator;

  constructor(page: Page, baseURL: string = 'http://localhost:4200') {
    this.page = page;
    this.url = `${baseURL}/feed`;
    
    // 初始化定位器
    this.welcomeCard = page.locator('.bg-gradient-to-r');
    this.storiesBar = page.locator('[data-testid="stories-bar"]').or(page.locator('.stories-bar'));
    this.createPostButton = page.locator('a[href="/post/create"]').or(page.locator('a[aria-label="發布新動態"]'));
    this.postsList = page.locator('.space-y-4 >> div');
    
    this.loadingSkeleton = page.locator('[role="status"]');
    this.emptyState = page.locator('.text-center >> text=還沒有任何動態');
    this.errorCard = page.locator('.border-red-200');
    
    this.postCards = page.locator('[class*="Card"]').filter({ hasText: /喜歡|打賞/ });
    this.likeButtons = page.locator('button:has-text("喜歡"), button:has-text("已喜歡")');
    this.tipButtons = page.locator('button:has-text("打賞")');
    
    // 導航連結
    this.discoverLink = page.locator('a[href="/discover"]');
    this.messagesLink = page.locator('a[href="/messages"]');
    this.profileLink = page.locator('a[href="/profile"]');
    this.notificationsLink = page.locator('a[href="/notifications"]');
  }

  /**
   * 導航到 Feed 頁面
   */
  async goto() {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  /**
   * 等待頁面加載完成
   */
  async waitForPageLoad() {
    // 等待歡迎卡片或錯誤狀態出現
    await Promise.race([
      this.welcomeCard.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.errorCard.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
    
    // 等待加載完成
    await this.loadingSkeleton.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  /**
   * 檢查是否已加載
   */
  async isLoaded() {
    return await this.welcomeCard.isVisible().catch(() => false);
  }

  /**
   * 獲取貼文數量
   */
  async getPostCount() {
    return await this.postCards.count();
  }

  /**
   * 點擊第一個貼文的喜歡按鈕
   */
  async likeFirstPost() {
    const firstLikeButton = this.likeButtons.first();
    await firstLikeButton.click();
  }

  /**
   * 點擊發布動態按鈕
   */
  async clickCreatePost() {
    await this.createPostButton.click();
  }

  /**
   * 導航到發現頁面
   */
  async navigateToDiscover() {
    await this.discoverLink.click();
  }

  /**
   * 導航到消息頁面
   */
  async navigateToMessages() {
    await this.messagesLink.click();
  }

  /**
   * 導航到個人資料頁面
   */
  async navigateToProfile() {
    await this.profileLink.click();
  }

  /**
   * 導航到通知頁面
   */
  async navigateToNotifications() {
    await this.notificationsLink.click();
  }

  /**
   * 驗證 Feed 頁面顯示正確
   */
  async expectFeedVisible() {
    await expect(this.welcomeCard).toBeVisible();
  }

  /**
   * 驗證有貼文顯示
   */
  async expectPostsVisible() {
    await expect(this.postCards.first()).toBeVisible();
  }

  /**
   * 驗證空狀態顯示
   */
  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }
}
