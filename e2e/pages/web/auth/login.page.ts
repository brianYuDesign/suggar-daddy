import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';

/**
 * 登入頁面 Page Object
 */
export class LoginPage extends BasePage {
  // Locators
  private emailInput = () => this.page.locator('input[name="email"]');
  private passwordInput = () => this.page.locator('input[name="password"]');
  private loginButton = () => this.page.locator('button[type="submit"], button:has-text("登入")');
  private registerLink = () => this.page.locator('a:has-text("註冊")');
  private forgotPasswordLink = () => this.page.locator('a:has-text("忘記密碼")');
  private googleLoginButton = () => this.page.locator('button:has-text("使用 Google 登入")');
  private errorMessage = () => this.page.locator('[data-testid="error-message"], .error-message, .alert-error');
  private rememberMeCheckbox = () => this.page.locator('input[type="checkbox"][name="rememberMe"]');

  /**
   * 導航到登入頁面
   */
  async navigateToLogin() {
    await this.navigate('/auth/login');
    await this.waitForSelector('input[name="email"]');
  }

  /**
   * 使用郵箱和密碼登入
   */
  async login(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.loginButton().click();
    await this.waitForLoading();
  }

  /**
   * 使用郵箱和密碼登入，並勾選記住我
   */
  async loginWithRememberMe(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.rememberMeCheckbox().check();
    await this.loginButton().click();
    await this.waitForLoading();
  }

  /**
   * 點擊註冊連結
   */
  async clickRegisterLink() {
    await this.registerLink().click();
  }

  /**
   * 點擊忘記密碼連結
   */
  async clickForgotPasswordLink() {
    await this.forgotPasswordLink().click();
  }

  /**
   * 點擊 Google 登入按鈕
   */
  async clickGoogleLogin() {
    await this.googleLoginButton().click();
  }

  /**
   * 取得錯誤訊息
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage().textContent() || '';
  }

  /**
   * 檢查錯誤訊息是否可見
   */
  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage().isVisible();
  }

  /**
   * 檢查登入按鈕是否被禁用
   */
  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.loginButton().isDisabled();
  }
}
