export default {
  displayName: 'moderation',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@suggar-daddy/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'json'],
  coverageDirectory: '../../coverage/libs/moderation',
};
