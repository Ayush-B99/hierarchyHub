import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { validateEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    HealthModule,
    EmployeesModule,
  ],
  // one place that shapes every error response, see common/all-exceptions.filter.ts
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
