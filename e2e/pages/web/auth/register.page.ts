import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';

/**
 * 註冊頁面 Page Object
 */
export class RegisterPage extends BasePage {
  // Locators
  private emailInput = () => this.page.locator('input[name="email"]');
  private passwordInput = () => this.page.locator('input[name="password"]');
  private displayNameInput = () => this.page.locator('input[name="displayName"]');
  private sugarDaddyButton = () => this.page.locator('button:has-text("Sugar Daddy")');
  private sugarBabyButton = () => this.page.locator('button:has-text("Sugar Baby")');
  private registerButton = () => this.page.locator('button[type="submit"]');
  private loginLink = () => this.page.locator('a:has-text("登入")');
  private generalError = () => this.page.locator('div.bg-red-50');
  private fieldError = () => this.page.locator('p.text-red-500');

  /**
   * 導航到註冊頁面
   */
  async navigateToRegister() {
    await this.navigate('/register');
    await this.waitForSelector('input[name="email"]');
  }

  /**
   * 註冊新用戶
   */
  async register(data: {
    email: string;
    password: string;
    displayName: string;
    userType: 'sugar_daddy' | 'sugar_baby';
  }) {
    // 1. Select role
    if (data.userType === 'sugar_daddy') {
      await this.sugarDaddyButton().click();
    } else {
      await this.sugarBabyButton().click();
    }

    // 2. Fill displayName
    if (data.displayName) {
      await this.displayNameInput().fill(data.displayName);
    }

    // 3. Fill email
    if (data.email) {
      await this.emailInput().fill(data.email);
    }

    // 4. Fill password
    if (data.password) {
      await this.passwordInput().fill(data.password);
    }

    // 5. Click submit
    await this.registerButton().click();
  }

  /**
   * 快速註冊（使用預設值）
   */
  async quickRegister(
    email: string,
    password: string,
    displayName: string,
    userType: 'sugar_daddy' | 'sugar_baby' = 'sugar_daddy'
  ) {
    await this.register({ email, password, displayName, userType });
  }

  /**
   * 點擊登入連結
   */
  async clickLoginLink() {
    await this.loginLink().click();
  }

  /**
   * 取得一般錯誤訊息
   */
  async getErrorMessage(): Promise<string> {
    const general = this.generalError();
    if (await general.isVisible()) {
      return (await general.textContent()) || '';
    }
    return '';
  }

  /**
   * 檢查註冊按鈕是否被禁用
   */
  async isRegisterButtonDisabled(): Promise<boolean> {
    return await this.registerButton().isDisabled();
  }

  /**
   * 檢查是否有驗證錯誤訊息（透過文字內容）
   */
  async hasValidationError(errorText: string): Promise<boolean> {
    return await this.page.locator(`p.text-red-500:has-text("${errorText}")`).isVisible();
  }

  /**
   * 檢查欄位是否有錯誤（相容舊介面）
   */
  async hasFieldError(field: string): Promise<boolean> {
    // Map field names to their expected error messages
    const errorMessages: Record<string, string> = {
      email: '請輸入有效的 Email',
      password: '密碼至少 8 個字元',
      displayName: '請輸入暱稱',
      name: '請輸入暱稱',
    };
    const msg = errorMessages[field];
    if (msg) {
      return await this.hasValidationError(msg);
    }
    // Fallback: check if any field error is visible
    return await this.fieldError().first().isVisible();
  }
}
