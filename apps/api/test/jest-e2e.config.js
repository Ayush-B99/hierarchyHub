/**
 * end-to-end tests boot the whole nest app and call it over http with supertest
 * they use the real test database, so start it first: `task e2e` does that for you
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: '<rootDir>/../tsconfig.json', diagnostics: { ignoreCodes: [151002] } },
    ],
  },
  setupFiles: ['<rootDir>/integration/load-env.js'],
  testEnvironment: 'node',
  maxWorkers: 1,
  testTimeout: 15000,
};
