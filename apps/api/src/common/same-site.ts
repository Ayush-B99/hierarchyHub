import type { NextFunction, Request, Response } from 'express';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * refuses changes sent by other websites (cross-site request forgery). the session cookie is
 * already same-site lax, this is a second layer: browsers say where a request came from in
 * the Origin and Sec-Fetch-Site headers, and anything changing data has to come from the web
 * app itself. tools without a browser, like curl, send neither and can't borrow anyone's
 * cookie anyway
 */
export function refuseCrossSiteChanges(allowedOrigins: readonly string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE.has(req.method)) return next();
    const origin = req.headers.origin;
    const fetchSite = req.headers['sec-fetch-site'];
    if ((origin && !allowedOrigins.includes(origin)) || fetchSite === 'cross-site') {
      res
        .status(403)
        .json({ statusCode: 403, message: 'Changes can only be made from Hierarchy Hub itself.' });
      return;
    }
    next();
  };
}
