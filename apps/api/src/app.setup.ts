import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { refuseCrossSiteChanges } from './common/same-site';
import helmet from 'helmet';
import { requestIdAndAccessLog } from './common/request-id';

export interface AppSetupOptions {
  corsOrigins: string[];
  /** how many proxies are in front of us, so rate limits use the visitor's real ip */
  trustProxy: number;
  accessLog: boolean;
}

/** the largest request body we accept. an employee is well under 1kb, so this is plenty */
export const BODY_LIMIT = '16kb';

/**
 * everything about how the app handles http, in one place, so main.ts and the end to end
 * tests set the app up exactly the same way
 */
export function configureApp(app: INestApplication, options: AppSetupOptions) {
  const express = app as NestExpressApplication;
  express.set('trust proxy', options.trustProxy);
  express.setGlobalPrefix('api');
  express.enableShutdownHooks();

  // security headers: no mime sniffing, no framing (clickjacking), no x-powered-by, strict transport etc
  express.use(helmet());
  express.enableCors({
    origin: options.corsOrigins,
    // lets the browser read these headers on cross-site responses
    exposedHeaders: ['ETag', 'X-Request-Id', 'Retry-After'],
  });

  express.use(requestIdAndAccessLog({ log: options.accessLog }));
  express.use(refuseCrossSiteChanges(options.corsOrigins));

  // only json, and only small bodies, so nobody can tie the api up with huge uploads
  express.useBodyParser('json', { limit: BODY_LIMIT });
  // problems reading the body happen before nest sees the request, so answer them here in
  // our usual error shape, without passing on the parser's own wording
  express.use(
    (err: { type?: string } | undefined, _req: Request, res: Response, next: NextFunction) => {
      if (err?.type === 'entity.parse.failed') {
        res.status(400).json({ statusCode: 400, message: 'The request body is not valid JSON.' });
        return;
      }
      if (err?.type === 'entity.too.large') {
        res.status(413).json({ statusCode: 413, message: 'That request is too large.' });
        return;
      }
      next(err);
    },
  );

  express.use((req: Request, res: Response, next: NextFunction) => {
    // caching (adr 0011): reads may be stored but must be checked with the server every time,
    // using the etag, so nobody ever sees stale data. a 304 costs almost nothing.
    // anything else, like a save, must never be stored at all
    // private, because what you see depends on who you are (adr 0017), so a shared cache
    // like a cdn must never keep one person's answer and hand it to someone else
    res.setHeader('Cache-Control', req.method === 'GET' ? 'private, no-cache' : 'no-store');
    res.setHeader('Vary', 'Cookie');
    next();
  });
}
