/**
 * Test Data Factory
 * 
 * 提供測試資料生成工具
 */

export class TestDataFactory {
  /**
   * 生成唯一的 Email
   */
  static generateEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}-${timestamp}-${random}@example.com`;
  }

  /**
   * 生成唯一的使用者名稱
   */
  static generateUsername(prefix: string = 'user'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 生成唯一的顯示名稱
   */
  static generateDisplayName(prefix: string = 'Test User'): string {
    const timestamp = Date.now();
    return `${prefix} ${timestamp}`;
  }

  /**
   * 生成安全的密碼
   */
  static generatePassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    const all = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * 生成測試用戶
   */
  static generateTestUser(role: 'sugar_baby' | 'sugar_daddy' = 'sugar_baby') {
    return {
      email: this.generateEmail(),
      password: this.generatePassword(),
      displayName: this.generateDisplayName(),
      role,
    };
  }

  /**
   * 生成多個測試用戶
   */
  static generateMultipleUsers(count: number, role: 'sugar_baby' | 'sugar_daddy' = 'sugar_baby') {
    return Array.from({ length: count }, () => this.generateTestUser(role));
  }

  /**
   * 生成測試貼文資料
   */
  static generatePost() {
    const timestamp = Date.now();
    return {
      content: `Test post content ${timestamp}\n這是一個測試貼文內容`,
      tags: ['test', 'e2e'],
      isPublic: true,
    };
  }

  /**
   * 生成測試評論資料
   */
  static generateComment() {
    const timestamp = Date.now();
    return {
      content: `Test comment ${timestamp}`,
    };
  }

  /**
   * 生成測試付款資料（非真實）
   */
  static generatePaymentData() {
    return {
      cardNumber: '4242424242424242', // Stripe 測試卡號
      expiryDate: '12/34',
      cvv: '123',
      cardholderName: 'Test User',
      billingAddress: '123 Test St',
      zipCode: '12345',
    };
  }

  /**
   * 生成 Stripe 測試卡資料
   */
  static generateStripeTestCard(type: 'success' | 'declined' | '3ds' = 'success') {
    const cards = {
      success: '4242424242424242',
      declined: '4000000000000002',
      '3ds': '4000002500003155', // 需要 3D Secure 驗證
    };
    
    return {
      cardNumber: cards[type],
      expiryDate: '12/34',
      cvc: '123',
    };
  }

  /**
   * 生成測試圖片 Base64
   */
  static generateTestImageBase64(): string {
    // 1x1 紅色像素 PNG
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  }

  /**
   * 生成隨機金額
   */
  static generateAmount(min: number = 10, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成未來日期
   */
  static generateFutureDate(daysFromNow: number = 30): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }

  /**
   * 生成過去日期
   */
  static generatePastDate(daysAgo: number = 30): Date {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  /**
   * 生成測試 Bio
   */
  static generateBio(): string {
    const bios = [
      '熱愛生活，享受每一天 🌟',
      '尋找有趣的靈魂 💫',
      '愛旅行、愛美食、愛生活 ✨',
      '讓生活充滿驚喜 🎉',
      '追求品質生活 💎',
    ];
    
    return bios[Math.floor(Math.random() * bios.length)];
  }

  /**
   * 生成測試地點
   */
  static generateLocation(): string {
    const locations = [
      '台北市',
      '新北市',
      '台中市',
      '高雄市',
      '台南市',
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
  }

  /**
   * 延遲執行（用於等待）
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成隨機字串
   */
  static generateRandomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
}

/**
 * 測試常數
 */
export const TEST_CONSTANTS = {
  // 預設密碼
  DEFAULT_PASSWORD: 'TestPassword123!',
  
  // 測試用戶
  TEST_USERS: {
    SUGAR_BABY: {
      email: 'test-baby@example.com',
      password: 'TestPassword123!',
      displayName: 'Test Baby',
      role: 'sugar_baby' as const,
    },
    SUGAR_DADDY: {
      email: 'test-daddy@example.com',
      password: 'TestPassword123!',
      displayName: 'Test Daddy',
      role: 'sugar_daddy' as const,
    },
  },
  
  // Stripe 測試卡號
  STRIPE_TEST_CARDS: {
    SUCCESS: '4242424242424242',
    DECLINED: '4000000000000002',
    INSUFFICIENT_FUNDS: '4000000000009995',
    EXPIRED: '4000000000000069',
    CVC_CHECK_FAIL: '4000000000000127',
    PROCESSING_ERROR: '4000000000000119',
    REQUIRES_3DS: '4000002500003155',
  },
  
  // 超時時間
  TIMEOUTS: {
    SHORT: 5000,
    MEDIUM: 10000,
    LONG: 30000,
    PAYMENT: 60000,
  },
  
  // API 端點
  API_ENDPOINTS: {
    AUTH: '/api/auth',
    USERS: '/api/users',
    POSTS: '/api/posts',
    PAYMENTS: '/api/payments',
    SUBSCRIPTIONS: '/api/subscriptions',
  },
};

/**
 * 測試助手類
 */
export class TestHelpers {
  /**
   * 等待元素並點擊
   */
  static async waitAndClick(locator: any, timeout: number = 10000) {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click();
  }

  /**
   * 等待並填寫表單
   */
  static async waitAndFill(locator: any, value: string, timeout: number = 10000) {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.fill(value);
  }

  /**
   * 安全地獲取文字內容
   */
  static async safeTextContent(locator: any, defaultValue: string = ''): Promise<string> {
    try {
      return await locator.textContent() || defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * 安全地檢查元素是否可見
   */
  static async safeIsVisible(locator: any): Promise<boolean> {
    try {
      return await locator.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * 等待網路閒置
   */
  static async waitForNetworkIdle(page: any, timeout: number = 5000) {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 截圖並附加到報告
   */
  static async takeScreenshot(page: any, name: string) {
    const screenshot = await page.screenshot({ fullPage: true });
    return { name, screenshot };
  }

  /**
   * 清除所有 Cookies
   */
  static async clearCookies(context: any) {
    await context.clearCookies();
  }

  /**
   * 清除 Local Storage
   */
  static async clearLocalStorage(page: any) {
    await page.evaluate(() => localStorage.clear());
  }

  /**
   * 清除所有儲存
   */
  static async clearAllStorage(page: any, context: any) {
    await this.clearCookies(context);
    await this.clearLocalStorage(page);
    await page.evaluate(() => sessionStorage.clear());
  }
}
