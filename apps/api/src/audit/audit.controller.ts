import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  auditQuerySchema,
  type AuditEvent,
  type AuditQuery,
  type Paginated,
} from '@hierarchy-hub/shared';
import type { Response } from 'express';
import type { SignedInAccount } from '../auth/auth.types';
import { AdminOnly, CurrentAccount } from '../auth/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuditService } from './audit.service';

@Controller('audit')
@AdminOnly()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @CurrentAccount() admin: SignedInAccount,
    @Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQuery,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Paginated<AuditEvent>> {
    // history is never cached anywhere
    res.setHeader('Cache-Control', 'no-store');
    return this.audit.list(admin, query);
  }
}
