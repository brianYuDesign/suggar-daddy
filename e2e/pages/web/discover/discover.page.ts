import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';
import { smartWaitForAPI, smartWaitForAnimation, smartWaitForElement } from '../../../utils/smart-wait';

/**
 * 探索頁面 Page Object
 */
export class DiscoverPage extends BasePage {
  // Locators
  private profileCard = () => this.page.locator('[data-testid="profile-card"]');
  private profileName = () => this.page.locator('[data-testid="profile-name"]');
  private profileBio = () => this.page.locator('[data-testid="profile-bio"]');
  private profileAge = () => this.page.locator('[data-testid="profile-age"]');
  private likeButton = () => this.page.locator('button[data-action="like"]');
  private passButton = () => this.page.locator('button[data-action="pass"]');
  private superLikeButton = () => this.page.locator('button[data-action="super-like"]');
  private undoButton = () => this.page.locator('button:has-text("復原"), button[data-action="undo"]');
  private matchModal = () => this.page.locator('[data-testid="match-modal"]');
  private noMoreProfilesMessage = () => this.page.locator('[data-testid="no-more-profiles"]');
  private errorState = () => this.page.locator('[data-testid="error-state"]');
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
    // 等待下一張卡片的 API 請求
    const nextCardPromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/(profiles|discover)/,
      timeout: 5000,
    }).catch(() => null); // 可能沒有更多卡片
    
    await this.likeButton().click();
    
    // 等待動畫和新卡片載入
    await Promise.race([
      nextCardPromise,
      smartWaitForAnimation(this.page, '[data-testid="profile-card"]').catch(() => null),
      new Promise(resolve => setTimeout(resolve, 1000)), // 最大等待 1 秒
    ]);
  }

  /**
   * 向左滑動（略過）
   */
  async swipeLeft() {
    // 等待下一張卡片的 API 請求
    const nextCardPromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/(profiles|discover)/,
      timeout: 5000,
    }).catch(() => null);
    
    await this.passButton().click();
    
    // 等待動畫和新卡片載入
    await Promise.race([
      nextCardPromise,
      smartWaitForAnimation(this.page, '[data-testid="profile-card"]').catch(() => null),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]);
  }

  /**
   * 超級喜歡
   */
  async superLike() {
    const nextCardPromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/(profiles|discover)/,
      timeout: 5000,
    }).catch(() => null);
    
    await this.superLikeButton().click();
    
    await Promise.race([
      nextCardPromise,
      smartWaitForAnimation(this.page, '[data-testid="profile-card"]').catch(() => null),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]);
  }

  /**
   * 復原上一個操作
   */
  async undo() {
    const undoPromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/undo/,
      timeout: 5000,
    }).catch(() => null);
    
    await this.undoButton().click();
    
    await Promise.race([
      undoPromise,
      smartWaitForAnimation(this.page, '[data-testid="profile-card"]').catch(() => null),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]);
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
   * 檢查是否沒有更多個人資料（包含空狀態和錯誤狀態）
   */
  async hasNoMoreProfiles(): Promise<boolean> {
    const noMore = await this.noMoreProfilesMessage().isVisible();
    const hasError = await this.errorState().isVisible();
    return noMore || hasError;
  }

  /**
   * 檢查是否顯示錯誤狀態
   */
  async hasErrorState(): Promise<boolean> {
    return await this.errorState().isVisible();
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
      // 短暫延遲避免過快操作（已在 swipeLeft/swipeRight 中處理）
    }
  }

  /**
   * 等待新的個人資料卡片載入
   */
  async waitForNewCard() {
    await smartWaitForElement(this.page, {
      selector: '[data-testid="profile-card"]',
      state: 'visible',
      timeout: 5000,
    });
  }
}
