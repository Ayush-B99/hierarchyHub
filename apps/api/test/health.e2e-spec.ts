import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { startApp } from './app';

describe('health and errors (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await startApp());
  });

  afterAll(() => app.close());

  it('GET /api/health says the process is up', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/health/ready checks the database too', async () => {
    const res = await request(app.getHttpServer()).get('/api/health/ready').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('unknown routes get the standard error shape', async () => {
    const res = await request(app.getHttpServer()).get('/api/nope').expect(404);
    expect(res.body).toEqual({ statusCode: 404, message: 'Cannot GET /api/nope' });
  });
});
