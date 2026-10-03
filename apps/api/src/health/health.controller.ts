import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { type HealthResponse } from '@hierarchy-hub/shared';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service';

const SERVICE = 'hierarchy-hub-api';
const VERSION = process.env.npm_package_version ?? '0.0.0';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  /**
   * liveness: is the api process up. doesn't touch the database on purpose, so a short
   * database blip doesn't make aws restart perfectly healthy api containers
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  live(): HealthResponse {
    return {
      status: 'ok',
      service: SERVICE,
      version: VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  /** readiness: can the api actually serve requests right now, including the database */
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const up = await this.database.isHealthy();
    res.status(up ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return {
      status: up ? 'ok' : 'degraded',
      service: SERVICE,
      version: VERSION,
      timestamp: new Date().toISOString(),
      database: up ? 'up' : 'down',
    };
  }
}
