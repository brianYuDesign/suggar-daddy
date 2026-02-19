import type { Config } from 'jest';

/**
 * Jest Configuration for Integration Tests
 * 
 * 執行整合測試 (*.integration.spec.ts)
 * 需要真實的外部服務（Docker Compose）
 */
const config: Config = {
  displayName: 'integration',
  testEnvironment: 'node',
  rootDir: '../../..',
  
  // Transform
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { 
      tsconfig: '<rootDir>/tsconfig.base.json',
      isolatedModules: true,
    }],
  },
  
  moduleFileExtensions: ['ts', 'js', 'html'],
  
  // Module name mapper
  moduleNameMapper: {
    '^@suggar-daddy/common$': '<rootDir>/libs/common/src/index.ts',
    '^@suggar-daddy/dto$': '<rootDir>/libs/dto/src/index.ts',
    '^@suggar-daddy/database$': '<rootDir>/libs/database/src/index.ts',
    '^@suggar-daddy/kafka$': '<rootDir>/libs/kafka/src/index.ts',
    '^@suggar-daddy/redis$': '<rootDir>/libs/redis/src/index.ts',
    '^@suggar-daddy/auth$': '<rootDir>/libs/auth/src/index.ts',
    '^@suggar-daddy/ui$': '<rootDir>/libs/ui/src/index.ts',
    '^@suggar-daddy/api-client$': '<rootDir>/libs/api-client/src/index.ts',
    '^@test/setup$': '<rootDir>/test/integration/setup/index.ts',
    '^@test/helpers$': '<rootDir>/test/integration/helpers/index.ts',
  },
  
  // 只匹配整合測試檔案
  testMatch: [
    '<rootDir>/apps/**/src/**/*.integration.spec.ts',
    '<rootDir>/test/integration/scenarios/**/*.integration.spec.ts',
  ],
  
  // 排除單元測試和 E2E 測試（但保留整合測試）
  testPathIgnorePatterns: [
    '/node_modules/',
    '(?<!\\.integration)\\.spec\\.ts$', // 排除非整合的單元測試
    '\\.e2e\\.spec\\.ts$', // 排除 E2E 測試
  ],
  
  // 覆蓋率設定
  collectCoverage: false,
  collectCoverageFrom: [
    'apps/**/src/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.integration.spec.ts',
    '!**/*.e2e.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/main.ts',
  ],
  coverageDirectory: '<rootDir>/test/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // 整合測試需要更長時間
  maxWorkers: 2, // 減少並行以避免資源競爭
  testTimeout: 30000, // 30 秒
  
  // 每個測試文件獨立運行，避免狀態污染
  maxConcurrency: 1,
  
  // Setup and teardown
  globalSetup: '<rootDir>/test/config/test-environment/global-setup.ts',
  globalTeardown: '<rootDir>/test/config/test-environment/global-teardown.ts',
  
  verbose: true,
};

export default config;
