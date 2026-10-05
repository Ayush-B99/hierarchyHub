import type { Request } from 'express';

/** who made the request, set by the session guard on every signed in request */
export interface SignedInAccount {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  employeeId: string;
  sessionId: string;
}

export type SignedInRequest = Request & { account: SignedInAccount };
