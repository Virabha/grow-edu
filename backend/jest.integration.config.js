/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testRegex: '.*\\.int-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  transformIgnorePatterns: ['node_modules/(?!.*uuid)'],
  testEnvironment: 'node',
  setupFiles: [
    'reflect-metadata',
    '<rootDir>/test/support/load-env.ts',
    '<rootDir>/jest.setup.ts',
    '<rootDir>/test/support/test-env.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 120000,
  maxWorkers: 2,
};
