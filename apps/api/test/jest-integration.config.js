/**
 * integration tests talk to a real postgres (the test database), not mocks
 * start it with `task db:up` and migrate it with `task db:migrate:test` first,
 * or just run `task integration` which does both
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.int-spec.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: '<rootDir>/../tsconfig.json', diagnostics: { ignoreCodes: [151002] } },
    ],
  },
  setupFiles: ['<rootDir>/integration/load-env.js'],
  testEnvironment: 'node',
  // tests share one database, so run them one file at a time
  maxWorkers: 1,
  testTimeout: 15000,
};
