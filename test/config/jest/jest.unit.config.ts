import type { Config } from 'jest';

/**
 * Jest Configuration for Unit Tests
 * 
 * 只執行單元測試 (*.spec.ts)，排除整合測試和 E2E 測試
 * 使用 node 環境，完全隔離外部依賴
 */
const config: Config = {
  displayName: 'unit',
  testEnvironment: 'node',
  rootDir: '../../..',
  
  // Transform
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { 
      tsconfig: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        baseUrl: '.',
        paths: {
          '@suggar-daddy/common': ['libs/common/src/index.ts'],
          '@suggar-daddy/dto': ['libs/dto/src/index.ts'],
          '@suggar-daddy/database': ['libs/database/src/index.ts'],
          '@suggar-daddy/kafka': ['libs/kafka/src/index.ts'],
          '@suggar-daddy/redis': ['libs/redis/src/index.ts'],
          '@suggar-daddy/auth': ['libs/auth/src/index.ts'],
          '@suggar-daddy/ui': ['libs/ui/src/index.ts'],
          '@suggar-daddy/api-client': ['libs/api-client/src/index.ts'],
        },
      },
    }],
  },
  
  moduleFileExtensions: ['ts', 'js', 'html'],
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@suggar-daddy/(.*)$': '<rootDir>/libs/$1/src/index.ts',
  },
  
  // 只匹配單元測試檔案
  testMatch: [
    '<rootDir>/apps/**/src/**/*.spec.ts',
    '<rootDir>/libs/**/src/**/*.spec.ts',
    '!<rootDir>/apps/**/src/**/*.integration.spec.ts',
    '!<rootDir>/apps/**/src/**/*.e2e.spec.ts',
  ],
  
  // 排除整合測試和 E2E 測試
  testPathIgnorePatterns: [
    '/node_modules/',
    '.integration.spec.ts$',
    '.e2e.spec.ts$',
    '/test/integration/',
    '/test/e2e/',
  ],
  
  // 覆蓋率設定
  collectCoverage: false, // 默認不收集，需要時用 --coverage
  collectCoverageFrom: [
    'apps/**/src/**/*.ts',
    'libs/**/src/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.integration.spec.ts',
    '!**/*.e2e.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/main.ts',
    '!**/*.module.ts',
  ],
  coverageDirectory: '<rootDir>/test/coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  
  // 效能優化
  maxWorkers: '50%',
  testTimeout: 10000, // 單元測試應該很快
  
  // 清晰的輸出
  verbose: true,
};

export default config;
