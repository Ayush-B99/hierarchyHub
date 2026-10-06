import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { validateEnv, type Env } from '../config/env';
import { poolConfig } from './pool';

const HEALTH_CHECK_TIMEOUT_MS = 2000;

/**
 * the one shared prisma client for the whole api
 * it talks through our own node-postgres pool so we control size, timeouts and tls (adr 0010)
 */
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;
  private closed = false;
  private readonly startupCheck: 'strict' | 'warn';

  constructor(config: ConfigService<Env, true>) {
    const env = validateEnv({
      NODE_ENV: config.get('NODE_ENV', { infer: true }),
      DATABASE_URL: config.get('DATABASE_URL', { infer: true }),
      DATABASE_SSL: config.get('DATABASE_SSL', { infer: true }),
      DATABASE_SSL_CA_FILE: config.get('DATABASE_SSL_CA_FILE', { infer: true }),
      DATABASE_POOL_MAX: config.get('DATABASE_POOL_MAX', { infer: true }),
      DATABASE_CONNECT_TIMEOUT_MS: config.get('DATABASE_CONNECT_TIMEOUT_MS', { infer: true }),
    });
    const pool = new Pool(poolConfig(env));
    // prisma's own logging is off on purpose: database errors can include whole rows,
    // salaries and all. our exception filter logs a safe summary instead
    super({ adapter: new PrismaPg(pool), log: [], errorFormat: 'minimal' });
    this.pool = pool;
    this.startupCheck = config.get('DATABASE_STARTUP_CHECK', { infer: true }) ?? 'strict';

    // a connection dropping while idle would otherwise crash the whole process
    this.pool.on('error', (error: Error & { code?: string }) => {
      this.logger.warn(`an idle database connection failed (${error.code ?? error.name})`);
    });
  }

  /** connects at startup and refuses to start if the database can't be reached */
  async onModuleInit() {
    try {
      await this.$queryRaw`select 1`;
      this.logger.log('connected to the database');
    } catch (error) {
      const code = (error as { code?: string }).code ?? (error as Error).name;
      if (this.startupCheck === 'warn') {
        this.logger.warn(`could not connect to the database yet (${code}), will keep trying`);
        return;
      }
      // the url has a password in it, so it never goes in the message
      throw new Error(
        `could not connect to the database (${code}). Is it running, and is DATABASE_URL right?`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.closed) return;
    this.closed = true;
    await this.$disconnect();
    await this.pool.end();
  }

  /** a quick "can we still talk to the database" for the readiness check */
  async isHealthy(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), HEALTH_CHECK_TIMEOUT_MS);
    });
    try {
      return await Promise.race([this.$queryRaw`select 1`.then(() => true), timeout]);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
