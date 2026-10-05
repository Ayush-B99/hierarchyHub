import { type INestApplication } from '@nestjs/common';
import { client, loadSamplePeople, startApp } from './app';

describe('security (e2e)', () => {
  let app: INestApplication;
  const http = () => client(app);

  beforeAll(async () => {
    const started = await startApp();
    app = started.app;
    await loadSamplePeople(started.db);
  });
  afterAll(() => app.close());

  it('sends the security headers and hides what server we run', async () => {
    const res = await http().get('/api/employees').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toMatch(/max-age/);
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('lets the web app call it, and nobody else', async () => {
    const allowed = await http().get('/api/employees').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-expose-headers']).toMatch(/ETag/);
    const other = await http().get('/api/employees').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('gives every request an id, keeping a sensible one the caller sent', async () => {
    const fresh = await http().get('/api/health');
    expect(fresh.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const kept = await http().get('/api/health').set('X-Request-Id', 'trace-abc-12345');
    expect(kept.headers['x-request-id']).toBe('trace-abc-12345');
    const replaced = await http().get('/api/health').set('X-Request-Id', 'bad id with spaces');
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('refuses request bodies over 16kb', async () => {
    const res = await http()
      .post('/api/employees')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ role: 'x'.repeat(20_000) }))
      .expect(413);
    expect(res.body).toEqual({ statusCode: 413, message: 'That request is too large.' });
  });

  it('explains broken json instead of failing', async () => {
    const res = await http()
      .post('/api/employees')
      .set('Content-Type', 'application/json')
      .send('{"broken": ')
      .expect(400);
    expect(res.body.message).toBe('The request body is not valid JSON.');
  });
});
