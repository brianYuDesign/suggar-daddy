import { Page, Locator, expect } from '@playwright/test';

/**
 * 登入頁面對象模型
 */
export class LoginPage {
  readonly page: Page;
  readonly url: string;
  
  // 表單元素
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  
  // 錯誤提示
  readonly errorMessage: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  
  // 密碼顯示切換
  readonly togglePasswordButton: Locator;

  constructor(page: Page, baseURL: string = 'http://localhost:4200') {
    this.page = page;
    this.url = `${baseURL}/login`;
    
    // 初始化定位器
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('input#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    this.registerLink = page.locator('a[href="/register"]');
    
    this.errorMessage = page.locator('.bg-red-50');
    this.emailError = page.locator('#email-error');
    this.passwordError = page.locator('#password-error');
    
    this.togglePasswordButton = page.locator('button[aria-label="顯示密碼"], button[aria-label="隱藏密碼"]');
  }

  /**
   * 導航到登入頁面
   */
  async goto() {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  /**
   * 等待頁面加載完成
   */
  async waitForPageLoad() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * 填寫登入表單
   */
  async fillForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * 提交登入表單
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * 執行完整登入流程
   */
  async login(email: string, password: string) {
    await this.fillForm(email, password);
    await this.submit();
  }

  /**
   * 切換密碼顯示
   */
  async togglePasswordVisibility() {
    await this.togglePasswordButton.click();
  }

  /**
   * 點擊忘記密碼連結
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * 點擊註冊連結
   */
  async clickRegister() {
    await this.registerLink.click();
  }

  /**
   * 驗證錯誤訊息顯示
   */
  async expectErrorMessage(message?: string) {
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    } else {
      await expect(this.errorMessage).toBeVisible();
    }
  }

  /**
   * 驗證 Email 錯誤
   */
  async expectEmailError(message?: string) {
    if (message) {
      await expect(this.emailError).toContainText(message);
    } else {
      await expect(this.emailError).toBeVisible();
    }
  }

  /**
   * 驗證 Password 錯誤
   */
  async expectPasswordError(message?: string) {
    if (message) {
      await expect(this.passwordError).toContainText(message);
    } else {
      await expect(this.passwordError).toBeVisible();
    }
  }
}
