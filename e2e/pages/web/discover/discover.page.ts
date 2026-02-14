import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';

/**
 * 探索頁面 Page Object
 */
export class DiscoverPage extends BasePage {
  // Locators
  private profileCard = () => this.page.locator('[data-testid="profile-card"]');
  private profileName = () => this.profileCard().locator('h2, [data-testid="profile-name"]');
  private profileBio = () => this.profileCard().locator('[data-testid="profile-bio"]');
  private profileAge = () => this.profileCard().locator('[data-testid="profile-age"]');
  private likeButton = () => this.page.locator('button:has-text("喜歡"), button[data-action="like"]');
  private passButton = () => this.page.locator('button:has-text("略過"), button[data-action="pass"]');
  private superLikeButton = () => this.page.locator('button:has-text("超級喜歡"), button[data-action="super-like"]');
  private undoButton = () => this.page.locator('button:has-text("復原"), button[data-action="undo"]');
  private matchModal = () => this.page.locator('[data-testid="match-modal"]');
  private noMoreProfilesMessage = () => this.page.locator('text=/沒有更多|沒有新的/');
  private toast = () => this.page.locator('[data-testid="toast"], .toast, .notification');

  /**
   * 導航到探索頁面
   */
  async navigateToDiscover() {
    await this.navigate('/discover');
    await this.waitForLoading();
  }

  /**
   * 向右滑動（喜歡）
   */
  async swipeRight() {
    await this.likeButton().click();
    await this.page.waitForTimeout(500); // 等待動畫完成
  }

  /**
   * 向左滑動（略過）
   */
  async swipeLeft() {
    await this.passButton().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 超級喜歡
   */
  async superLike() {
    await this.superLikeButton().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 復原上一個操作
   */
  async undo() {
    await this.undoButton().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 取得當前顯示的個人資料名稱
   */
  async getCurrentProfileName(): Promise<string> {
    return await this.profileName().textContent() || '';
  }

  /**
   * 取得當前顯示的個人簡介
   */
  async getCurrentProfileBio(): Promise<string> {
    return await this.profileBio().textContent() || '';
  }

  /**
   * 取得當前顯示的年齡
   */
  async getCurrentProfileAge(): Promise<string> {
    return await this.profileAge().textContent() || '';
  }

  /**
   * 檢查是否有個人資料卡片
   */
  async hasProfileCard(): Promise<boolean> {
    return await this.profileCard().isVisible();
  }

  /**
   * 檢查是否顯示配對成功彈窗
   */
  async isMatchModalVisible(): Promise<boolean> {
    return await this.matchModal().isVisible();
  }

  /**
   * 關閉配對成功彈窗
   */
  async closeMatchModal() {
    const closeButton = this.matchModal().locator('button:has-text("關閉"), button[data-action="close"]');
    await closeButton.click();
  }

  /**
   * 檢查是否沒有更多個人資料
   */
  async hasNoMoreProfiles(): Promise<boolean> {
    return await this.noMoreProfilesMessage().isVisible();
  }

  /**
   * 取得提示訊息
   */
  async getToastMessage(): Promise<string> {
    return await this.toast().textContent() || '';
  }

  /**
   * 連續滑動多次
   */
  async swipeMultiple(direction: 'left' | 'right', count: number) {
    for (let i = 0; i < count; i++) {
      if (direction === 'left') {
        await this.swipeLeft();
      } else {
        await this.swipeRight();
      }
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * 等待新的個人資料卡片載入
   */
  async waitForNewCard() {
    await this.page.waitForTimeout(1000);
    await this.waitForSelector('[data-testid="profile-card"]');
  }
}
