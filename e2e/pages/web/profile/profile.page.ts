import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';
import { smartWaitForAPI, smartWaitForElement } from '../../../utils/smart-wait';

/**
 * 個人檔案頁面 Page Object
 */
export class ProfilePage extends BasePage {
  // Locators
  private nameInput = () => this.page.locator('input[name="name"], input[name="displayName"]');
  private bioTextarea = () => this.page.locator('textarea[name="bio"]');
  private ageInput = () => this.page.locator('input[name="age"]');
  private locationInput = () => this.page.locator('input[name="location"]');
  private interestsInput = () => this.page.locator('input[name="interests"]');
  private saveButton = () => this.page.locator('button[type="submit"], button:has-text("保存"), button:has-text("儲存"), button:has-text("Save")');
  private uploadAvatarButton = () => this.page.locator('button:has-text("上傳頭像"), input[type="file"][accept*="image"]');
  private successMessage = () => this.page.locator('.toast-success, [data-testid="success-message"], .bg-green-50');
  private errorMessage = () => this.page.locator('.toast-error, [data-testid="error-message"], .bg-red-50');

  /**
   * 導航到個人檔案頁面
   */
  async navigateToProfile() {
    await this.navigate('/profile');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 更新個人檔案
   */
  async updateProfile(data: {
    name?: string;
    bio?: string;
    age?: number;
    location?: string;
    interests?: string[];
  }) {
    if (data.name) {
      await this.nameInput().fill(data.name);
    }

    if (data.bio) {
      await this.bioTextarea().fill(data.bio);
    }

    if (data.age) {
      const ageInput = this.ageInput();
      if (await ageInput.isVisible().catch(() => false)) {
        await ageInput.fill(data.age.toString());
      }
    }

    if (data.location) {
      const locationInput = this.locationInput();
      if (await locationInput.isVisible().catch(() => false)) {
        await locationInput.fill(data.location);
      }
    }

    if (data.interests && data.interests.length > 0) {
      const interestsInput = this.interestsInput();
      if (await interestsInput.isVisible().catch(() => false)) {
        await interestsInput.fill(data.interests.join(', '));
      }
    }

    // 等待 API 回應
    const updatePromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/(users\/me|profile)/,
      timeout: 10000,
    }).catch(() => null);

    await this.saveButton().click();

    await updatePromise;
  }

  /**
   * 檢查是否更新成功
   */
  async isUpdateSuccessful(): Promise<boolean> {
    return await this.successMessage().isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * 取得錯誤訊息
   */
  async getErrorMessage(): Promise<string> {
    const error = this.errorMessage();
    if (await error.isVisible().catch(() => false)) {
      return await error.textContent() || '';
    }
    return '';
  }

  /**
   * 檢查個人檔案是否完整
   */
  async isProfileComplete(): Promise<boolean> {
    const hasName = await this.nameInput().inputValue().then(v => v.length > 0).catch(() => false);
    const hasBio = await this.bioTextarea().inputValue().then(v => v.length > 0).catch(() => false);
    
    return hasName && hasBio;
  }
}
