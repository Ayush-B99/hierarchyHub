// runs before any test file loads, so the whole app is built against the test database
// (setting it later is too late, the app reads its settings once when it first loads)
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must point at a database whose name ends in _test');
}
process.env.DATABASE_URL = url;
process.env.NODE_ENV = 'test';
