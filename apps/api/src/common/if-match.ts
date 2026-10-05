import { HttpException, HttpStatus } from '@nestjs/common';

/** the version a change says it was made from */
export type ExpectedVersion = number;

/**
 * reads the If-Match header on a change. the etag of an employee is "v" plus their version
 * (eg "v3"), so this tells us which version the user was looking at when they hit save
 * - no header is refused with 428, so a client can't skip the clash check by accident
 * - * ("any version") and weak tags (W/"v3") are refused too. both would let a change
 *   through without proving it was made from the latest version
 */
export function expectedVersion(header: string | undefined): ExpectedVersion {
  if (!header) {
    throw new HttpException(
      'Send the If-Match header with the version you loaded, eg If-Match: "v3"',
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
  const version = /^"v(\d{1,9})"$/.exec(header.trim())?.[1];
  if (!version) {
    throw new HttpException(
      'If-Match must be the exact version you loaded, eg "v3"',
      HttpStatus.BAD_REQUEST,
    );
  }
  return Number(version);
}

export const changedBySomeoneElse = () =>
  new HttpException(
    'Someone else changed this employee while you were editing. Reload to see their changes, then try again.',
    HttpStatus.PRECONDITION_FAILED,
  );
