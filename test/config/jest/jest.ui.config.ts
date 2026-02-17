import type { Config } from 'jest';

/**
 * Jest Configuration for UI Component Tests
 * 
 * 執行前端組件測試 (*.spec.tsx)
 * 使用 jsdom 環境模擬瀏覽器
 */
const config: Config = {
  displayName: 'ui',
  testEnvironment: 'jsdom',
  rootDir: '../../..',
  
  // 只匹配前端組件測試
  testMatch: [
    '<rootDir>/apps/web/**/*.spec.tsx',
    '<rootDir>/apps/admin/**/*.spec.tsx',
    '<rootDir>/libs/ui/**/*.spec.tsx',
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
  ],
  
  // Transform 設定 - 使用 ts-jest 處理 TypeScript 和 TSX
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // Module 別名對應
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/web/$1',
    '^@suggar-daddy/(.*)$': '<rootDir>/libs/$1/src/index.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/config/test-environment/ui-test-setup.ts',
  ],
  
  // 覆蓋率設定
  collectCoverage: false,
  collectCoverageFrom: [
    'apps/web/**/*.{ts,tsx}',
    'apps/admin/**/*.{ts,tsx}',
    'libs/ui/**/*.{ts,tsx}',
    '!**/*.spec.tsx',
    '!**/*.stories.tsx',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/dist/**',
  ],
  coverageDirectory: '<rootDir>/test/coverage/ui',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  
  // 效能設定
  maxWorkers: '50%',
  testTimeout: 15000,
  
  verbose: true,
};

export default config;
