/**
 * Custom Jest Matchers
 * 
 * 自定義斷言，讓測試更具可讀性
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeISODateString(): R;
      toHaveStatusCode(expected: number): R;
      toHaveErrorMessage(expected: string): R;
    }
  }
}

// UUID 格式驗證
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },
});

// ISO 日期字串驗證
expect.extend({
  toBeISODateString(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && received === date.toISOString();
    
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid ISO date string`
          : `expected ${received} to be a valid ISO date string`,
    };
  },
});

// HTTP 狀態碼驗證
expect.extend({
  toHaveStatusCode(received: any, expected: number) {
    const actualStatus = received?.status || received?.statusCode;
    const pass = actualStatus === expected;
    
    return {
      pass,
      message: () =>
        pass
          ? `expected status code not to be ${expected}`
          : `expected status code to be ${expected}, but got ${actualStatus}`,
    };
  },
});

// 錯誤訊息驗證
expect.extend({
  toHaveErrorMessage(received: any, expected: string) {
    const actualMessage = received?.data?.message || received?.message;
    const pass = actualMessage === expected || 
                 (Array.isArray(actualMessage) && actualMessage.includes(expected));
    
    return {
      pass,
      message: () =>
        pass
          ? `expected error message not to include "${expected}"`
          : `expected error message to include "${expected}", but got "${actualMessage}"`,
    };
  },
});

export {};
