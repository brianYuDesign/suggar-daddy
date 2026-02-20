import 'reflect-metadata';

/**
 * Jest Setup File
 * 為測試環境做初始化
 */

// 環境變數
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/recommendation_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// 全域測試超時
jest.setTimeout(10000);

// 抑制 console 警告（可選）
global.console = {
  ...console,
  // error: jest.fn(),
  // warn: jest.fn(),
};
