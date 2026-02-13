export default {
  displayName: 'common',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@suggar-daddy/redis$': '<rootDir>/../../libs/redis/src/index.ts',
    '^@suggar-daddy/common$': '<rootDir>/../../libs/common/src/index.ts',
    '^@suggar-daddy/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/common',
};
