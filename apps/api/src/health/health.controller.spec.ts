import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@hierarchy-hub/shared';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('returns a response that matches the shared contract', () => {
    const result = controller.check();
    expect(healthResponseSchema.parse(result).status).toBe('ok');
  });
});
