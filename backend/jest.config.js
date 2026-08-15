/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: '<rootDir>/../tsconfig.json',
    }],
  },
  // uuid v13 is ESM-only. Node 24 can require() ESM so the app runs fine, but
  // jest's module runtime cannot — it must be transformed. Reached via
  // files.service -> dashboard.service.
  transformIgnorePatterns: ['node_modules/(?!.*uuid)'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata', '<rootDir>/../jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
