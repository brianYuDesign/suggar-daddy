export default {
  displayName: 'payment-service',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@suggar-daddy/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/payment-service',
};
