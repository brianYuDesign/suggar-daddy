import { Page, Locator, expect } from '@playwright/test';

/**
 * 註冊頁面對象模型
 */
export class RegisterPage {
  readonly page: Page;
  readonly url: string;
  
  // 表單元素
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly displayNameInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  
  // 角色選擇
  readonly sugarDaddyOption: Locator;
  readonly sugarBabyOption: Locator;
  
  // 錯誤提示
  readonly errorMessage: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly displayNameError: Locator;
  
  // 密碼顯示切換
  readonly togglePasswordButton: Locator;

  constructor(page: Page, baseURL: string = 'http://localhost:4200') {
    this.page = page;
    this.url = `${baseURL}/register`;
    
    // 初始化定位器
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('input#password');
    this.displayNameInput = page.locator('input#displayName');
    this.submitButton = page.locator('button[type="submit"]');
    this.loginLink = page.locator('a[href="/login"]');
    
    // 角色選擇按鈕（根據 aria-label 選擇）
    this.sugarDaddyOption = page.locator('button[aria-label="選擇 Sugar Daddy"]');
    this.sugarBabyOption = page.locator('button[aria-label="選擇 Sugar Baby"]');
    
    this.errorMessage = page.locator('.bg-red-50');
    this.emailError = page.locator('#email-error');
    this.passwordError = page.locator('#password-error');
    this.displayNameError = page.locator('#displayName-error');
    
    this.togglePasswordButton = page.locator('button[aria-label="顯示密碼"], button[aria-label="隱藏密碼"]');
  }

  /**
   * 導航到註冊頁面
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
    await expect(this.displayNameInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * 選擇用戶角色
   */
  async selectRole(role: 'sugar_daddy' | 'sugar_baby') {
    if (role === 'sugar_daddy') {
      await this.sugarDaddyOption.click();
    } else {
      await this.sugarBabyOption.click();
    }
  }

  /**
   * 填寫註冊表單
   */
  async fillForm(data: {
    displayName: string;
    email: string;
    password: string;
    role: 'sugar_daddy' | 'sugar_baby';
  }) {
    await this.selectRole(data.role);
    await this.displayNameInput.fill(data.displayName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
  }

  /**
   * 提交註冊表單
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * 執行完整註冊流程
   */
  async register(data: {
    displayName: string;
    email: string;
    password: string;
    role: 'sugar_daddy' | 'sugar_baby';
  }) {
    await this.fillForm(data);
    await this.submit();
  }

  /**
   * 點擊登入連結
   */
  async clickLogin() {
    await this.loginLink.click();
  }

  /**
   * 驗證角色已選中
   */
  async expectRoleSelected(role: 'sugar_daddy' | 'sugar_baby') {
    const option = role === 'sugar_daddy' ? this.sugarDaddyOption : this.sugarBabyOption;
    await expect(option).toHaveAttribute('aria-pressed', 'true');
  }
}
