import { Page } from '@playwright/test';

/**
 * 基礎 Page Object
 * 所有頁面類別都應繼承此類別
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * 導航到指定路徑
   */
  async navigate(path: string) {
    await this.page.goto(path);
  }

  /**
   * 等待頁面載入完成
   */
  async waitForLoading() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 等待特定選擇器出現
   */
  async waitForSelector(selector: string, options?: { timeout?: number }) {
    await this.page.waitForSelector(selector, options);
  }

  /**
   * 等待導航完成
   */
  async waitForNavigation(url?: string | RegExp) {
    if (url) {
      await this.page.waitForURL(url);
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * 取得當前 URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * 等待 API 請求完成
   */
  async waitForAPIRequest(urlPattern: string | RegExp) {
    return this.page.waitForResponse(
      (response) =>
        (typeof urlPattern === 'string'
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url())) && 
        response.ok()
    );
  }

  /**
   * 截圖
   */
  async screenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  }
}
