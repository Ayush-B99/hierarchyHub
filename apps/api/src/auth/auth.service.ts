import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SIGN_UP_RECEIVED,
  type Me,
  type SignInInput,
  type SignUpInput,
} from '@hierarchy-hub/shared';
import type { Env } from '../config/env';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import type { SignedInAccount } from './auth.types';
import { burnTime, hashPassword, passwordMatches } from './passwords';
import { hashToken, newSessionToken } from './session-cookie';

// five wrong passwords in a row locks the account for 15 minutes. combined with the rate
// limit per ip, guessing a 12 character password this way would take centuries
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

// the last seen time is only written every few minutes, not on every request
const TOUCH_EVERY_MS = 5 * 60_000;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const WRONG = 'Email or password is wrong.';

@Injectable()
export class AuthService {
  private readonly sessionMs: number;
  private readonly maxSessionMs: number;
  readonly secureCookie: boolean;

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.sessionMs = config.get('SESSION_HOURS', { infer: true }) * HOUR;
    this.maxSessionMs = config.get('SESSION_MAX_DAYS', { infer: true }) * DAY;
    const secure = config.get('COOKIE_SECURE', { infer: true });
    this.secureCookie =
      secure === undefined
        ? config.get('NODE_ENV', { infer: true }) === 'production'
        : secure === 'true';
  }

  get cookieMaxAgeMs() {
    return this.maxSessionMs;
  }

  /**
   * anyone can ask for an account. it does nothing until an admin approves it. everyone gets
   * the same answer, even if the email already has an account, so this can't be used to find
   * out who has one
   */
  async signUp(input: SignUpInput): Promise<string> {
    const passwordHash = await hashPassword(input.password);
    const taken = await this.db.account.findUnique({ where: { email: input.email } });
    if (!taken) {
      await this.db
        .$transaction(async (tx) => {
          await tx.account.create({ data: { email: input.email, name: input.name, passwordHash } });
          await this.audit.record(tx, {
            action: 'account.signed_up',
            details: { accountName: input.name, accountEmail: input.email },
          });
        })
        // two sign ups with the same email at the same moment, the first one wins quietly
        .catch((error: { code?: string }) => {
          if (error.code !== 'P2002') throw error;
        });
    }
    return SIGN_UP_RECEIVED;
  }

  /** checks the password and starts a session. returns the cookie token and who signed in */
  async signIn(input: SignInInput): Promise<{ token: string; me: Me }> {
    const account = await this.db.account.findUnique({ where: { email: input.email } });
    if (!account) {
      await burnTime(input.password);
      // only someone at the top can see these, they aren't about anyone in the organisation
      await this.db.$transaction((tx) =>
        this.audit.record(tx, {
          action: 'auth.sign_in_failed',
          details: { email: input.email, reason: 'unknown email' },
        }),
      );
      throw new HttpException(WRONG, HttpStatus.UNAUTHORIZED);
    }
    const subject = account.employeeId
      ? { employeeId: account.employeeId, name: account.name }
      : null;

    // while locked, even the right password is refused, so guessing can't carry on
    if (account.lockedUntil && account.lockedUntil > new Date()) {
      throw locked(account.lockedUntil);
    }

    if (!(await passwordMatches(account.passwordHash, input.password))) {
      const failed = account.failedLogins + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
      await this.db.$transaction(async (tx) => {
        await tx.account.update({
          where: { id: account.id },
          data: lock ? { failedLogins: 0, lockedUntil } : { failedLogins: failed },
        });
        await this.audit.record(tx, {
          action: lock ? 'auth.locked' : 'auth.sign_in_failed',
          subject,
          details: lock
            ? { email: account.email, lockedUntil: lockedUntil.toISOString() }
            : { email: account.email, reason: 'wrong password', attempt: failed },
        });
      });
      throw lock ? locked(lockedUntil) : new HttpException(WRONG, HttpStatus.UNAUTHORIZED);
    }

    // the password is right, so it's safe to say why they can't come in yet
    if (account.status === 'pending') {
      throw new HttpException(
        'Your account is waiting for an admin to approve it.',
        HttpStatus.FORBIDDEN,
      );
    }
    if (account.status === 'disabled' || !account.employeeId) {
      throw new HttpException(
        'This account has been turned off. Ask an admin if you think that’s wrong.',
        HttpStatus.FORBIDDEN,
      );
    }

    const now = new Date();
    const { token, id } = newSessionToken();
    const employeeId = account.employeeId;
    await this.db.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: account.id },
        data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now },
      });
      // tidy up: this account's old sessions that have run out, and anyone else's
      await tx.session.deleteMany({ where: { expiresAt: { lt: now } } });
      await tx.session.create({
        data: { id, accountId: account.id, expiresAt: new Date(now.getTime() + this.sessionMs) },
      });
      await this.audit.record(tx, {
        action: 'auth.signed_in',
        actor: { accountId: account.id, employeeId, name: account.name },
        subject: { employeeId, name: account.name },
      });
    });

    return {
      token,
      me: {
        id: account.id,
        name: account.name,
        email: account.email,
        isAdmin: account.isAdmin,
        employeeId: account.employeeId,
      },
    };
  }

  async signOut(account: SignedInAccount) {
    await this.db.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { id: account.sessionId } });
      await this.audit.record(tx, {
        action: 'auth.signed_out',
        actor: { accountId: account.id, employeeId: account.employeeId, name: account.name },
        subject: { employeeId: account.employeeId, name: account.name },
      });
    });
  }

  /**
   * who a session cookie belongs to, or null if it's unknown, run out, or the account can't
   * sign in any more (turned off, or its employee was deleted). checked on every request, so
   * turning an account off takes effect straight away
   */
  async whoIs(token: string): Promise<SignedInAccount | null> {
    const id = hashToken(token);
    const session = await this.db.session.findUnique({ where: { id }, include: { account: true } });
    if (!session) return null;

    const now = Date.now();
    const { account } = session;
    if (session.expiresAt.getTime() <= now || account.status !== 'active' || !account.employeeId) {
      await this.db.session.deleteMany({ where: { id } });
      return null;
    }

    // sliding expiry: each visit pushes the end back, but never past the maximum
    if (now - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
      const latest = session.createdAt.getTime() + this.maxSessionMs;
      await this.db.session.update({
        where: { id },
        data: {
          lastSeenAt: new Date(now),
          expiresAt: new Date(Math.min(now + this.sessionMs, latest)),
        },
      });
    }

    return {
      id: account.id,
      name: account.name,
      email: account.email,
      isAdmin: account.isAdmin,
      employeeId: account.employeeId,
      sessionId: id,
    };
  }
}

function locked(until: Date) {
  const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
  return new HttpException(
    `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
