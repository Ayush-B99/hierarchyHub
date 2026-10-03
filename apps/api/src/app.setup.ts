import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * everything about how the app handles http, in one place, so main.ts and the end to end
 * tests set the app up exactly the same way
 */
export function configureApp(app: INestApplication, options: { corsOrigins: string[] }) {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.enableCors({ origin: options.corsOrigins });

  app.use((req: Request, res: Response, next: NextFunction) => {
    // caching (adr 0011): reads may be stored but must be checked with the server every time,
    // using the etag, so nobody ever sees stale data. a 304 costs almost nothing.
    // anything else, like a save, must never be stored at all
    res.setHeader('Cache-Control', req.method === 'GET' ? 'no-cache' : 'no-store');
    next();
  });
}
