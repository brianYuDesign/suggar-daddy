import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';
import { smartWaitForAPI } from '../../../utils/smart-wait';

/**
 * 內容創建頁面 Page Object
 */
export class ContentPage extends BasePage {
  // Locators
  private createPostButton = () => this.page.locator('button:has-text("發布"), button:has-text("Create"), a[href*="/post/create"]');
  private contentInput = () => this.page.locator('textarea[name="content"], [contenteditable], textarea[placeholder*="內容"]');
  private titleInput = () => this.page.locator('input[name="title"]');
  private visibilitySelect = () => this.page.locator('select[name="visibility"], [data-testid="visibility-select"]');
  private isPPVCheckbox = () => this.page.locator('input[name="isPPV"], input[type="checkbox"][id*="ppv"]');
  private priceInput = () => this.page.locator('input[name="price"]');
  private publishButton = () => this.page.locator('button:has-text("發布"), button:has-text("Publish"), button[type="submit"]');
  private uploadImageButton = () => this.page.locator('button:has-text("上傳圖片"), input[type="file"][accept*="image"]');
  private postList = () => this.page.locator('[data-testid="post-item"], .post-item, article');

  /**
   * 導航到發布內容頁面
   */
  async navigateToCreatePost() {
    await this.navigate('/post/create');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 導航到我的內容頁面
   */
  async navigateToMyPosts() {
    await this.navigate('/profile/posts');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 創建免費內容
   */
  async createFreePost(content: string, title?: string) {
    await this.navigateToCreatePost();

    if (title) {
      const titleField = this.titleInput();
      if (await titleField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleField.fill(title);
      }
    }

    await this.contentInput().fill(content);

    // 設置為公開
    const visibilityField = this.visibilitySelect();
    if (await visibilityField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await visibilityField.selectOption('PUBLIC');
    }

    // 等待 API 回應
    const publishPromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/posts/,
      timeout: 10000,
    }).catch(() => null);

    await this.publishButton().click();

    await publishPromise;
  }

  /**
   * 創建付費內容（PPV）
   */
  async createPaidPost(content: string, price: number, title?: string) {
    await this.navigateToCreatePost();

    if (title) {
      const titleField = this.titleInput();
      if (await titleField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleField.fill(title);
      }
    }

    await this.contentInput().fill(content);

    // 勾選 PPV
    const ppvCheckbox = this.isPPVCheckbox();
    if (await ppvCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ppvCheckbox.check();

      // 填寫價格
      await this.priceInput().fill(price.toString());
    }

    // 設置為訂閱者可見
    const visibilityField = this.visibilitySelect();
    if (await visibilityField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await visibilityField.selectOption('SUBSCRIBERS_ONLY');
    }

    // 等待 API 回應
    const publishPromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/posts/,
      timeout: 10000,
    }).catch(() => null);

    await this.publishButton().click();

    await publishPromise;
  }

  /**
   * 取得貼文數量
   */
  async getPostCount(): Promise<number> {
    return await this.postList().count();
  }

  /**
   * 刪除最新的貼文
   */
  async deleteLatestPost() {
    const deleteBtn = this.page.locator('[data-testid="post-item"]:first-child button:has-text("刪除"), .post-item:first-child button:has-text("Delete")').first();
    
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();

      // 確認刪除
      const confirmBtn = this.page.locator('button:has-text("確認"), button:has-text("Confirm")');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }
    }
  }
}
