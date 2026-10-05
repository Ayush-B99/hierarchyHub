import { z } from 'zod';

/**
 * the account contract: sign up, sign in and approving new accounts (adr 0016)
 * used by the web forms and the api, so both agree on what's allowed
 */

/** long enough to be hard to guess, short enough that hashing stays quick */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Keep it under 254 characters')
  .email('Enter a valid email address');

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Required')
      .max(100, 'Keep it under 100 characters')
      .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value), 'Remove hidden or control characters'),
    email,
    password: z
      .string()
      .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX, `Keep it under ${PASSWORD_MAX} characters`),
  })
  .strict()
  // a password that contains your own email name is one of the first things anyone tries
  .refine((input) => !input.password.toLowerCase().includes(input.email.split('@')[0] ?? ''), {
    path: ['password'],
    message: "Don't use your email address in your password",
  });

export const signInSchema = z
  .object({
    email,
    // only checked against the stored hash, so any length up to the maximum is fine here
    password: z.string().min(1, 'Required').max(PASSWORD_MAX),
  })
  .strict();

export const approveAccountSchema = z.object({ employeeId: z.string().uuid() }).strict();

/** what an admin can change about an account below them: admin or not, and on or off */
export const updateAccountSchema = z
  .object({
    isAdmin: z.boolean().optional(),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Send at least one thing to change');

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ApproveAccountInput = z.infer<typeof approveAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export type AccountStatus = 'pending' | 'active' | 'disabled';

/** the signed in person, from GET /api/auth/me */
export interface Me {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  /** the employee this login belongs to */
  employeeId: string;
}

/** an account as admins see it on the approvals page */
export interface AccountSummary {
  id: string;
  name: string;
  email: string;
  status: AccountStatus;
  isAdmin: boolean;
  employeeId: string | null;
  createdAt: string;
  approvedAt: string | null;
  lastLoginAt: string | null;
}

/** the message every sign up gets, whether or not the email was already used */
export const SIGN_UP_RECEIVED =
  'Thanks. An admin will check your details and approve your account, then you can sign in.';
