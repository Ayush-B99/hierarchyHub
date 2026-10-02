/** End-to-end tests boot the whole Nest app and call it over HTTP with supertest. */
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
  testEnvironment: 'node',
};
