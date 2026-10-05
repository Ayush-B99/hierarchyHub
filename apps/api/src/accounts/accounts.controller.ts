import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import {
  approveAccountSchema,
  type AccountSummary,
  type ApproveAccountInput,
} from '@hierarchy-hub/shared';
import type { Response } from 'express';
import { z } from 'zod';
import type { SignedInAccount } from '../auth/auth.types';
import { AdminOnly, CurrentAccount } from '../auth/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AccountsService } from './accounts.service';

const id = new ZodValidationPipe(z.string().uuid('That is not a valid account id'));

@Controller('accounts')
@AdminOnly()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(
    @CurrentAccount() admin: SignedInAccount,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccountSummary[]> {
    res.setHeader('Cache-Control', 'no-store');
    return this.accounts.list(admin);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentAccount() admin: SignedInAccount,
    @Param('id', id) accountId: string,
    @Body(new ZodValidationPipe(approveAccountSchema)) input: ApproveAccountInput,
  ): Promise<AccountSummary> {
    return this.accounts.approve(admin, accountId, input.employeeId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  reject(@Param('id', id) accountId: string) {
    return this.accounts.reject(accountId);
  }
}
