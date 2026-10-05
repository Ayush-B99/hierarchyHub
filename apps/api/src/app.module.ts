import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { SessionGuard } from './auth/session.guard';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { AppThrottlerGuard } from './common/throttler.guard';
import { validateEnv, type Env } from './config/env';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { HierarchyModule } from './hierarchy/hierarchy.module';

const MINUTE = 60_000;
const isRead = (method: string) => method === 'GET' || method === 'HEAD';
const methodOf = (context: { switchToHttp(): { getRequest<T>(): T } }) =>
  context.switchToHttp().getRequest<{ method: string }>().method;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // rate limits per ip address: generous for reading, stricter for changes, so one script
    // can't flood the database. kept in memory, so each api instance counts on its own
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        errorMessage: 'Too many requests. Please wait a moment and try again.',
        throttlers: [
          {
            name: 'reads',
            ttl: MINUTE,
            limit: config.get('RATE_LIMIT_PER_MINUTE', { infer: true }),
            skipIf: (context) => !isRead(methodOf(context)),
          },
          {
            name: 'writes',
            ttl: MINUTE,
            limit: config.get('RATE_LIMIT_WRITES_PER_MINUTE', { infer: true }),
            skipIf: (context) => isRead(methodOf(context)),
          },
        ],
      }),
    }),
    DatabaseModule,
    HierarchyModule,
    HealthModule,
    AuthModule,
    AccountsModule,
    EmployeesModule,
  ],
  providers: [
    // one place that shapes every error response, see common/all-exceptions.filter.ts
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    // runs after the rate limit, so a flood of requests is turned away before any database work
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
