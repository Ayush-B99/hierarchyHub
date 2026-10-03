import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

/** what a caller's request id may look like, anything else is replaced so logs can't be polluted */
const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

export function requestIdFrom(incoming: string | undefined): string {
  return incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
}

/** the request id we attached, for logs and error reports */
export function requestIdOf(req: unknown): string | undefined {
  return (req as { requestId?: string } | undefined)?.requestId;
}

/**
 * gives every request an id, sends it back in a header and puts it in the logs,
 * so "it broke at 3pm" can be traced to the exact request
 * the access log has the path only, never the query string, since searches can contain names
 */
export function requestIdAndAccessLog(options: { log: boolean }) {
  const logger = new Logger('Http');
  return (req: Request, res: Response, next: NextFunction) => {
    const id = requestIdFrom(req.header(REQUEST_ID_HEADER));
    (req as Request & { requestId: string }).requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    if (options.log) {
      const started = process.hrtime.bigint();
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        logger.log(`${req.method} ${req.path} ${res.statusCode} ${ms.toFixed(0)}ms [${id}]`);
      });
    }
    next();
  };
}
