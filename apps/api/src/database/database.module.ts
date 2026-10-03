import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/** global so every feature module can use the database without importing this again */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
