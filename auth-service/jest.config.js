module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/index.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>', '<rootDir>/../test'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@entities/(.*)$': '<rootDir>/entities/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@dtos/(.*)$': '<rootDir>/dtos/$1',
    '^@guards/(.*)$': '<rootDir>/guards/$1',
    '^@strategies/(.*)$': '<rootDir>/strategies/$1',
    '^@decorators/(.*)$': '<rootDir>/decorators/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
  },
};
