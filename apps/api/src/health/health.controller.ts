import { Controller, Get } from '@nestjs/common';
import { type HealthResponse } from '@hierarchy-hub/shared';

@Controller('health')
export class HealthController {
  /** Liveness check for load balancers and the web app's status indicator. */
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'hierarchy-hub-api',
      version: process.env.npm_package_version ?? '0.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
