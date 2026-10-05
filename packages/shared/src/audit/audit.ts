import { z } from 'zod';

/** everything the audit trail records (adr 0018) */
export const AUDIT_ACTIONS = [
  'employee.created',
  'employee.updated',
  'employee.deleted',
  'account.signed_up',
  'account.approved',
  'account.rejected',
  'account.updated',
  'auth.signed_in',
  'auth.sign_in_failed',
  'auth.locked',
  'auth.signed_out',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** someone as they were when it happened */
export interface AuditPerson {
  employeeId: string | null;
  name: string;
}

/** a manager in a change, with their name at the time */
export interface AuditManager {
  id: string;
  name: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  action: AuditAction;
  /** who did it. null when nobody was signed in, eg a sign up or a failed sign in */
  actor: AuditPerson | null;
  /** who it was about */
  subject: AuditPerson | null;
  /** for each field that changed, what it was and what it became */
  changes: Record<string, { from: unknown; to: unknown }> | null;
  /** anything else worth knowing, eg the email a failed sign in used */
  details: Record<string, unknown> | null;
  requestId: string | null;
}

export const auditQuerySchema = z
  .object({
    action: z.enum(AUDIT_ACTIONS).optional(),
    /** events about this person, or done by them */
    employeeId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export type AuditQuery = z.infer<typeof auditQuerySchema>;
