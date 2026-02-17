export default {
  displayName: 'admin',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/**/*.spec.ts',
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.spec.tsx',
    '<rootDir>/**/*.test.tsx',
  ],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        jsx: 'react',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  moduleNameMapper: {
    '\\.(css|scss|sass|less)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/api$': '<rootDir>/src/__mocks__/api.ts',
    '^@suggar-daddy/ui$': '<rootDir>/../../libs/ui/src/index.ts',
    '^@suggar-daddy/api-client$': '<rootDir>/../../libs/api-client/src/index.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    'middleware.test.ts', // Next.js middleware 需要特殊環境，暫時跳過
  ],
  coverageDirectory: '../../coverage/apps/admin',
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },
};
