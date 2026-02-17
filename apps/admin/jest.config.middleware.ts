/**
 * Jest 配置 - Next.js Middleware 測試
 * 使用 Node 環境來測試 Next.js middleware
 */
export default {
  displayName: 'admin-middleware',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/middleware.test.ts'],
  coverageDirectory: '../../coverage/apps/admin-middleware',
};
