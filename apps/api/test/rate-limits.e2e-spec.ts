import { type INestApplication } from '@nestjs/common';
import { client, loadSamplePeople, startApp } from './app';

// in its own file so the app loads fresh with these tiny limits, see startApp

describe('rate limits (e2e)', () => {
  let app: INestApplication;
  const http = () => client(app);

  beforeAll(async () => {
    // tiny limits so the test can hit them quickly
    const started = await startApp({
      RATE_LIMIT_PER_MINUTE: '5',
      RATE_LIMIT_WRITES_PER_MINUTE: '2',
    });
    app = started.app;
    await loadSamplePeople(started.db);
  });
  afterAll(() => app.close());

  it('slows down too many changes from one place, and says when to retry', async () => {
    const body = { role: 'x' };
    await http()
      .patch('/api/employees/00000000-0000-4000-8000-000000000999')
      .set('If-Match', '"v1"')
      .send(body);
    await http()
      .patch('/api/employees/00000000-0000-4000-8000-000000000999')
      .set('If-Match', '"v1"')
      .send(body);
    const res = await http()
      .patch('/api/employees/00000000-0000-4000-8000-000000000999')
      .set('If-Match', '"v1"')
      .send(body)
      .expect(429);
    expect(res.body).toEqual({
      statusCode: 429,
      message: 'Too many requests. Please wait a moment and try again.',
    });
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('counts reads separately, with their own higher limit', async () => {
    // the writes above used up their limit, reads still work
    for (let i = 0; i < 5; i += 1) await http().get('/api/employees').expect(200);
    await http().get('/api/employees').expect(429);
  });

  it('never limits the health checks the load balancer uses', async () => {
    for (let i = 0; i < 10; i += 1) await http().get('/api/health').expect(200);
  });
});
