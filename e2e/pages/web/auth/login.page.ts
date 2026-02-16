import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';
import { smartWaitForAPI, smartWaitForNavigation } from '../../../utils/smart-wait';

/**
 * 登入頁面 Page Object
 */
export class LoginPage extends BasePage {
  // Locators
  private emailInput = () => this.page.locator('input[name="email"]');
  private passwordInput = () => this.page.locator('input[name="password"]');
  private loginButton = () => this.page.locator('button[type="submit"], button:has-text("登入")');
  private registerLink = () => this.page.locator('a:has-text("免費註冊")');
  private forgotPasswordLink = () => this.page.locator('a:has-text("忘記密碼？")');
  private errorMessage = () => this.page.locator('div.bg-red-50.text-red-600, p.text-red-500');

  /**
   * 導航到登入頁面
   */
  async navigateToLogin() {
    await this.navigate('/login');
    await this.waitForSelector('input[name="email"]');
  }

  /**
   * 使用郵箱和密碼登入
   */
  async login(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    
    // 準備監聽登入 API 回應
    const loginPromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/auth\/login/,
      timeout: 10000,
    });
    
    await this.loginButton().click();
    
    // 等待 API 回應（成功或失敗）
    try {
      await loginPromise;
      // 如果登入成功，等待導航到 feed/dashboard
      await smartWaitForNavigation(this.page, /\/(feed|dashboard)/, { timeout: 5000 }).catch(() => {
        // 導航可能已經完成，忽略錯誤
      });
    } catch {
      // 登入失敗，等待錯誤訊息出現
      await this.page.waitForSelector('div.bg-red-50, p.text-red-500', {
        state: 'visible',
        timeout: 3000,
      }).catch(() => {
        // 錯誤訊息可能已經出現
      });
    }
  }

  /**
   * 使用郵箱和密碼登入（記住我功能不存在，直接呼叫 login）
   */
  async loginWithRememberMe(email: string, password: string) {
    await this.login(email, password);
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
