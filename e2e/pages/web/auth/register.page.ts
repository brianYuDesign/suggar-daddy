import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';

/**
 * 註冊頁面 Page Object
 */
export class RegisterPage extends BasePage {
  // Locators
  private emailInput = () => this.page.locator('input[name="email"]');
  private passwordInput = () => this.page.locator('input[name="password"]');
  private confirmPasswordInput = () => this.page.locator('input[name="confirmPassword"]');
  private nameInput = () => this.page.locator('input[name="name"]');
  private roleSelect = () => this.page.locator('select[name="role"]');
  private registerButton = () => this.page.locator('button[type="submit"], button:has-text("註冊")');
  private loginLink = () => this.page.locator('a:has-text("登入")');
  private termsCheckbox = () => this.page.locator('input[type="checkbox"][name="acceptTerms"]');
  private errorMessage = (field?: string) => 
    field 
      ? this.page.locator(`[data-field="${field}"] .error-message, [data-testid="${field}-error"]`)
      : this.page.locator('[data-testid="error-message"], .error-message, .alert-error');

  /**
   * 導航到註冊頁面
   */
  async navigateToRegister() {
    await this.navigate('/auth/register');
    await this.waitForSelector('input[name="email"]');
  }

  /**
   * 註冊新用戶
   */
  async register(data: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    role: 'CREATOR' | 'SUBSCRIBER';
    acceptTerms?: boolean;
  }) {
    await this.emailInput().fill(data.email);
    await this.passwordInput().fill(data.password);
    await this.confirmPasswordInput().fill(data.confirmPassword);
    await this.nameInput().fill(data.name);
    await this.roleSelect().selectOption(data.role);
    
    if (data.acceptTerms !== false) {
      await this.termsCheckbox().check();
    }
    
    await this.registerButton().click();
    await this.waitForLoading();
  }

  /**
   * 快速註冊（使用預設值）
   */
  async quickRegister(email: string, password: string, name: string, role: 'CREATOR' | 'SUBSCRIBER' = 'SUBSCRIBER') {
    await this.register({
      email,
      password,
      confirmPassword: password,
      name,
      role,
      acceptTerms: true,
    });
  }

  /**
   * 點擊登入連結
   */
  async clickLoginLink() {
    await this.loginLink().click();
  }

  /**
   * 取得欄位錯誤訊息
   */
  async getFieldError(field: string): Promise<string> {
    return await this.errorMessage(field).textContent() || '';
  }

  /**
   * 取得一般錯誤訊息
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage().textContent() || '';
  }

  /**
   * 檢查註冊按鈕是否被禁用
   */
  async isRegisterButtonDisabled(): Promise<boolean> {
    return await this.registerButton().isDisabled();
  }

  /**
   * 檢查欄位是否有錯誤
   */
  async hasFieldError(field: string): Promise<boolean> {
    return await this.errorMessage(field).isVisible();
  }
}
