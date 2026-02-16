export default {
  displayName: 'web',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  moduleNameMapper: {
    '\\.(css|scss|sass|less)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/$1',
    '^../lib/api$': '<rootDir>/src/__mocks__/api.ts',
    '^../../lib/api$': '<rootDir>/src/__mocks__/api.ts',
    '^../../../lib/api$': '<rootDir>/src/__mocks__/api.ts',
    '^../../../../lib/api$': '<rootDir>/src/__mocks__/api.ts',
    '^@suggar-daddy/ui$': '<rootDir>/../../libs/ui/src/index.ts',
  },
  coverageDirectory: '../../coverage/apps/web',
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'providers/**/*.{ts,tsx}',
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
