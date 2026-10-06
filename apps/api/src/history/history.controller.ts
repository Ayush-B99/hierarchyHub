import { Controller, Get, Res } from '@nestjs/common';
import type { OrgChange } from '@hierarchy-hub/shared';
import type { Response } from 'express';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  list(@Res({ passthrough: true }) res: Response): Promise<OrgChange[]> {
    res.setHeader('Cache-Control', 'no-store');
    return this.history.list();
  }
}
