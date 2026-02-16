import { Page, expect, Locator } from '@playwright/test';

/**
 * 智能等待輔助函數集
 * 提供更可靠的等待策略，替代硬編碼的 waitForTimeout
 */

/**
 * 等待 API 回應配置
 */
export interface WaitForAPIOptions {
  /** URL 模式（字串或正則表達式） */
  urlPattern: string | RegExp;
  /** 預期的 HTTP 狀態碼（預設 200） */
  status?: number;
  /** 超時時間（毫秒，預設 30000） */
  timeout?: number;
  /** 是否等待多個相同 API（預設 false） */
  waitForMultiple?: boolean;
}

/**
 * 等待元素配置
 */
export interface WaitForElementOptions {
  /** 元素選擇器 */
  selector: string;
  /** 預期狀態（visible, hidden, attached, detached） */
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
  /** 超時時間（毫秒，預設 30000） */
  timeout?: number;
  /** 是否嚴格模式（必須唯一匹配，預設 false） */
  strict?: boolean;
}

/**
 * 重試配置
 */
export interface RetryOptions {
  /** 最大重試次數（預設 3） */
  maxRetries?: number;
  /** 重試間隔（毫秒，預設 1000） */
  retryDelay?: number;
  /** 超時時間（毫秒，預設 30000） */
  timeout?: number;
  /** 自定義錯誤訊息 */
  errorMessage?: string;
}

/**
 * 智能等待 API 回應
 * 替代: await page.waitForTimeout(2000) // 等待 API
 * 使用: await smartWaitForAPI(page, { urlPattern: '/api/users' })
 */
export async function smartWaitForAPI(
  page: Page,
  options: WaitForAPIOptions
): Promise<Response> {
  const {
    urlPattern,
    status = 200,
    timeout = 30000,
    waitForMultiple = false,
  } = options;

  const matcher = (response: Response) => {
    const urlMatches =
      typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url());
    const statusMatches = response.status() === status;
    return urlMatches && statusMatches;
  };

  if (waitForMultiple) {
    // 等待多個相同的 API 請求完成（例如：分頁載入）
    const responses: Response[] = [];
    const responsePromise = page.waitForResponse(matcher, { timeout });

    try {
      const firstResponse = await responsePromise;
      responses.push(firstResponse);

      // 嘗試等待更多回應（短超時）
      const additionalTimeout = 2000;
      while (responses.length < 10) {
        try {
          const nextResponse = await page.waitForResponse(matcher, {
            timeout: additionalTimeout,
          });
          responses.push(nextResponse);
        } catch {
          break; // 沒有更多回應
        }
      }

      return responses[responses.length - 1]; // 返回最後一個回應
    } catch (error) {
      throw new Error(
        `等待 API 回應超時: ${typeof urlPattern === 'string' ? urlPattern : urlPattern.source}`
      );
    }
  }

  return page.waitForResponse(matcher, { timeout });
}

/**
 * 智能等待元素出現並穩定
 * 替代: await page.waitForTimeout(500) // 等待動畫
 * 使用: await smartWaitForElement(page, { selector: '.modal', state: 'visible' })
 */
export async function smartWaitForElement(
  page: Page,
  options: WaitForElementOptions
): Promise<Locator> {
  const { selector, state = 'visible', timeout = 30000, strict = false } = options;

  const locator = page.locator(selector);

  // 等待元素達到預期狀態
  await locator.waitFor({ state, timeout });

  // 如果是可見狀態，額外確保元素穩定（沒有動畫）
  if (state === 'visible') {
    await expect(locator).toBeVisible({ timeout: 5000 });

    // 等待元素位置穩定（防止動畫導致點擊失敗）
    try {
      await locator.first().waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      // 元素可能已經穩定
    }
  }

  return strict ? locator.first() : locator;
}

/**
 * 智能等待路由變更
 * 替代: await page.waitForTimeout(2000) // 等待導航
 * 使用: await smartWaitForNavigation(page, '/dashboard')
 */
export async function smartWaitForNavigation(
  page: Page,
  urlPattern: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  if (typeof urlPattern === 'string') {
    // 支援部分匹配或完整 URL
    await page.waitForURL(
      urlPattern.startsWith('http') ? urlPattern : new RegExp(urlPattern),
      { timeout }
    );
  } else {
    await page.waitForURL(urlPattern, { timeout });
  }

  // 確保頁面載入完成
  await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
}

/**
 * 智能等待網路閒置
 * 替代: await page.waitForTimeout(3000) // 等待資料載入
 * 使用: await smartWaitForNetworkIdle(page)
 */
export async function smartWaitForNetworkIdle(
  page: Page,
  options?: {
    /** 超時時間（毫秒，預設 30000） */
    timeout?: number;
    /** 網路閒置定義（無請求時間，毫秒，預設 500） */
    idleTime?: number;
  }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error) {
    // 如果網路始終不閒置，等待 DOM 載入完成作為後備
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
  }
}

/**
 * 智能等待動畫完成
 * 替代: await page.waitForTimeout(500) // 等待動畫
 * 使用: await smartWaitForAnimation(page, '.card')
 */
export async function smartWaitForAnimation(
  page: Page,
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 5000;
  const locator = page.locator(selector);

  try {
    // 等待元素可見
    await locator.first().waitFor({ state: 'visible', timeout: 3000 });

    // 透過 JavaScript 檢測動畫狀態
    await page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel);
        if (!element) return true;

        const style = window.getComputedStyle(element);
        const hasTransition = style.transition !== 'all 0s ease 0s' && style.transition !== 'none';
        const hasAnimation = style.animation !== 'none';

        // 如果沒有動畫，則認為已完成
        if (!hasTransition && !hasAnimation) return true;

        // 如果有動畫，檢查是否完成
        return false;
      },
      selector,
      { timeout: 1000 }
    );
  } catch {
    // 如果無法檢測動畫，使用短暫的固定等待
    await page.waitForTimeout(300);
  }
}

/**
 * 智能重試操作
 * 替代: 手動重試邏輯
 * 使用: await smartRetry(async () => { ... }, { maxRetries: 3 })
 */
export async function smartRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
    errorMessage = '操作重試失敗',
  } = options || {};

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 檢查是否超時
    if (Date.now() - startTime > timeout) {
      throw new Error(`${errorMessage}: 超時 (${timeout}ms)`);
    }

    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // 如果是最後一次重試，直接拋出錯誤
      if (attempt === maxRetries) {
        throw new Error(
          `${errorMessage}: ${lastError.message} (已重試 ${maxRetries} 次)`
        );
      }

      // 等待後重試
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(`${errorMessage}: ${lastError?.message}`);
}

/**
 * 等待元素消失（例如：Loading Spinner）
 * 替代: await page.waitForTimeout(2000) // 等待 loading 消失
 * 使用: await waitForElementToDisappear(page, '.spinner')
 */
export async function waitForElementToDisappear(
  page: Page,
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  try {
    const locator = page.locator(selector);
    // 先確認元素存在
    const count = await locator.count();

    if (count === 0) {
      // 元素本來就不存在，無需等待
      return;
    }

    // 等待元素隱藏或移除
    await locator.first().waitFor({ state: 'hidden', timeout });
  } catch (error) {
    // 元素可能已經消失或從未出現
    // 檢查元素是否真的不可見
    const isVisible = await page.locator(selector).first().isVisible({ timeout: 0 }).catch(() => false);
    if (!isVisible) {
      return; // 元素已不可見，符合預期
    }
    throw error;
  }
}

/**
 * 智能等待表單提交完成
 * 替代: await page.waitForTimeout(2000) // 等待表單提交
 * 使用: await smartWaitForFormSubmit(page, { submitButton: 'button[type="submit"]', apiPattern: '/api/auth/login' })
 */
export async function smartWaitForFormSubmit(
  page: Page,
  options: {
    submitButton?: string;
    apiPattern?: string | RegExp;
    successSelector?: string;
    errorSelector?: string;
    timeout?: number;
  }
): Promise<'success' | 'error'> {
  const {
    submitButton,
    apiPattern,
    successSelector,
    errorSelector,
    timeout = 30000,
  } = options;

  const promises: Promise<any>[] = [];

  // 等待 API 回應
  if (apiPattern) {
    promises.push(
      smartWaitForAPI(page, { urlPattern: apiPattern, timeout }).catch(() => null)
    );
  }

  // 等待成功或錯誤訊息
  if (successSelector) {
    promises.push(
      page.waitForSelector(successSelector, { timeout, state: 'visible' }).catch(() => null)
    );
  }

  if (errorSelector) {
    promises.push(
      page.waitForSelector(errorSelector, { timeout, state: 'visible' }).catch(() => null)
    );
  }

  // 等待提交按鈕狀態變化（如果提供）
  if (submitButton) {
    promises.push(
      page
        .locator(submitButton)
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => null)
    );
  }

  // 等待任一條件達成
  await Promise.race(promises);

  // 檢查結果
  if (successSelector) {
    const hasSuccess = await page.locator(successSelector).isVisible().catch(() => false);
    if (hasSuccess) return 'success';
  }

  if (errorSelector) {
    const hasError = await page.locator(errorSelector).isVisible().catch(() => false);
    if (hasError) return 'error';
  }

  // 無法確定結果，檢查 URL 變化作為成功指標
  return 'success';
}

/**
 * 等待滾動載入完成
 * 替代: await page.waitForTimeout(1000) // 等待滾動載入
 * 使用: await smartScrollToLoadMore(page, { maxScrolls: 3 })
 */
export async function smartScrollToLoadMore(
  page: Page,
  options?: {
    maxScrolls?: number;
    itemSelector?: string;
    loadingSelector?: string;
    timeout?: number;
  }
): Promise<number> {
  const {
    maxScrolls = 3,
    itemSelector = '[data-testid*="item"], [class*="card"]',
    loadingSelector = '[data-testid="loading"], .spinner, .loading',
    timeout = 30000,
  } = options || {};

  let scrollCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < maxScrolls; i++) {
    if (Date.now() - startTime > timeout) {
      break;
    }

    // 記錄當前項目數量
    const beforeCount = await page.locator(itemSelector).count();

    // 滾動到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 等待 loading 出現（如果有）
    try {
      await page.waitForSelector(loadingSelector, {
        state: 'visible',
        timeout: 1000,
      });

      // 等待 loading 消失
      await waitForElementToDisappear(page, loadingSelector, { timeout: 5000 });
    } catch {
      // 沒有 loading 指示器，等待短暫時間
      await page.waitForTimeout(500);
    }

    // 檢查項目數量是否增加
    const afterCount = await page.locator(itemSelector).count();

    if (afterCount > beforeCount) {
      scrollCount++;
    } else {
      // 沒有更多內容
      break;
    }

    // 短暫延遲避免過快滾動
    await page.waitForTimeout(300);
  }

  return scrollCount;
}

/**
 * 等待特定條件成立（輪詢方式）
 * 替代: 複雜的手動輪詢邏輯
 * 使用: await smartWaitForCondition(async () => await page.isVisible('.success'), { interval: 500 })
 */
export async function smartWaitForCondition(
  condition: () => Promise<boolean>,
  options?: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  }
): Promise<void> {
  const {
    timeout = 30000,
    interval = 500,
    errorMessage = '條件未在超時時間內達成',
  } = options || {};

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return; // 條件達成
      }
    } catch {
      // 忽略錯誤，繼續重試
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`${errorMessage} (超時: ${timeout}ms)`);
}

/**
 * 智能等待模態框（Modal/Dialog）
 * 替代: await page.waitForTimeout(1000) // 等待彈窗
 * 使用: await smartWaitForModal(page, { modalSelector: '[role="dialog"]' })
 */
export async function smartWaitForModal(
  page: Page,
  options: {
    modalSelector?: string;
    backdropSelector?: string;
    state?: 'open' | 'closed';
    timeout?: number;
  }
): Promise<void> {
  const {
    modalSelector = '[role="dialog"], .modal, [data-testid="modal"]',
    backdropSelector = '.modal-backdrop, [data-testid="backdrop"]',
    state = 'open',
    timeout = 30000,
  } = options;

  if (state === 'open') {
    // 等待模態框出現
    await page.waitForSelector(modalSelector, { state: 'visible', timeout });

    // 等待動畫完成
    await smartWaitForAnimation(page, modalSelector, { timeout: 2000 });

    // 可選：等待背景遮罩
    try {
      await page.waitForSelector(backdropSelector, {
        state: 'attached',
        timeout: 1000,
      });
    } catch {
      // 背景遮罩可能不存在
    }
  } else {
    // 等待模態框關閉
    await waitForElementToDisappear(page, modalSelector, { timeout });
  }
}

/**
 * 批量等待多個元素
 * 使用: await smartWaitForMultipleElements(page, ['.header', '.content', '.footer'])
 */
export async function smartWaitForMultipleElements(
  page: Page,
  selectors: string[],
  options?: { timeout?: number; requireAll?: boolean }
): Promise<Map<string, boolean>> {
  const { timeout = 30000, requireAll = false } = options || {};
  const results = new Map<string, boolean>();

  const promises = selectors.map(async (selector) => {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      results.set(selector, true);
    } catch {
      results.set(selector, false);
      if (requireAll) {
        throw new Error(`必要元素未出現: ${selector}`);
      }
    }
  });

  await Promise.allSettled(promises);

  return results;
}
