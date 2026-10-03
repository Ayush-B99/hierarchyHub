import { HttpException, HttpStatus } from '@nestjs/common';

/** what the If-Match header asked for: a specific version, or "any version" (*) */
export type ExpectedVersion = number | 'any';

/**
 * reads the If-Match header on a change. the etag of an employee is "v" plus their version
 * (eg "v3"), so this tells us which version the user was looking at when they hit save
 * no header at all is refused with 428, so a client can't skip the clash check by accident
 */
export function expectedVersion(header: string | undefined): ExpectedVersion {
  if (!header) {
    throw new HttpException(
      'Send the If-Match header with the version you loaded, eg If-Match: "v3"',
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
  if (header.trim() === '*') return 'any';
  const version = /^(?:W\/)?"v(\d{1,9})"$/.exec(header.trim())?.[1];
  if (!version) {
    throw new HttpException('If-Match must look like "v3"', HttpStatus.BAD_REQUEST);
  }
  return Number(version);
}

export const changedBySomeoneElse = () =>
  new HttpException(
    'Someone else changed this employee while you were editing. Reload to see their changes, then try again.',
    HttpStatus.PRECONDITION_FAILED,
  );
