import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@hierarchy-hub/shared';
import { DatabaseService } from '../database/database.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  async function setup(databaseUp: boolean) {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DatabaseService, useValue: { isHealthy: async () => databaseUp } }],
    }).compile();
    const res = { status: jest.fn() };
    return { controller: moduleRef.get(HealthController), res };
  }

  it('liveness answers without touching the database', async () => {
    const { controller } = await setup(false);
    expect(healthResponseSchema.parse(controller.live()).status).toBe('ok');
  });

  it('readiness reports the database as up', async () => {
    const { controller, res } = await setup(true);
    const body = await controller.ready(res as never);
    expect(body).toMatchObject({ status: 'ok', database: 'up' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('readiness answers 503 when the database is down', async () => {
    const { controller, res } = await setup(false);
    const body = await controller.ready(res as never);
    expect(body).toMatchObject({ status: 'degraded', database: 'down' });
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
