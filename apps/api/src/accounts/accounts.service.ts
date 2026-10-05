import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AccountSummary, UpdateAccountInput } from '@hierarchy-hub/shared';
import type { Account } from '@prisma/client';
import type { SignedInAccount } from '../auth/auth.types';
import { actorFrom, AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';

const summary = (account: Account): AccountSummary => ({
  id: account.id,
  name: account.name,
  email: account.email,
  status: account.status as AccountSummary['status'],
  isAdmin: account.isAdmin,
  employeeId: account.employeeId,
  createdAt: account.createdAt.toISOString(),
  approvedAt: account.approvedAt?.toISOString() ?? null,
  lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
});

@Injectable()
export class AccountsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly hierarchy: HierarchyService,
    private readonly audit: AuditService,
  ) {}

  /**
   * what an admin can see: every account waiting for approval (they aren't anyone yet), and
   * the accounts of people below them. never the accounts of people above or beside them
   */
  async list(admin: SignedInAccount): Promise<AccountSummary[]> {
    const team = await this.hierarchy.idsBelow(admin.employeeId);
    const accounts = await this.db.account.findMany({
      where: {
        OR: [{ status: 'pending' }, { employeeId: { in: [...team, admin.employeeId] } }],
      },
      orderBy: [{ status: 'desc' }, { createdAt: 'asc' }],
    });
    return accounts.map(summary);
  }

  /**
   * links a waiting account to an employee and lets it sign in. the employee has to be below
   * the admin, so nobody can approve an account as their boss, or as themselves twice over
   */
  async approve(
    admin: SignedInAccount,
    accountId: string,
    employeeId: string,
  ): Promise<AccountSummary> {
    if (!(await this.db.employee.findUnique({ where: { id: employeeId } }))) {
      throw new NotFoundException({
        message: 'That employee no longer exists',
        errors: { employeeId: ['That employee no longer exists'] },
      });
    }
    if (!(await this.hierarchy.isBelow(admin.employeeId, employeeId))) {
      throw new ForbiddenException({
        message: 'You can only link accounts to people below you',
        errors: { employeeId: ['You can only link accounts to people below you'] },
      });
    }

    try {
      return await this.db.$transaction(async (tx) => {
        // only flips a pending account, so two admins approving at once can't both win
        const { count } = await tx.account.updateMany({
          where: { id: accountId, status: 'pending' },
          data: { status: 'active', employeeId, approvedAt: new Date(), approvedBy: admin.id },
        });
        if (count === 0) throw await this.missingOrHandled(accountId);
        const approved = await tx.account.findUniqueOrThrow({ where: { id: accountId } });
        const employee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
        await this.audit.record(tx, {
          action: 'account.approved',
          actor: actorFrom(admin),
          subject: { employeeId, name: `${employee.firstName} ${employee.lastName}` },
          details: { accountName: approved.name, accountEmail: approved.email },
        });
        return summary(approved);
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException({
          message: 'That employee already has an account',
          errors: { employeeId: ['That employee already has an account'] },
        });
      }
      throw error;
    }
  }

  /**
   * makes someone an admin or not, or turns their account off or back on. only for accounts
   * of people below you, so nobody can change their own access or anyone senior's, and the
   * person at the top always keeps theirs
   */
  async update(
    admin: SignedInAccount,
    accountId: string,
    input: UpdateAccountInput,
  ): Promise<AccountSummary> {
    const account = await this.db.account.findUnique({ where: { id: accountId } });
    if (!account || account.status === 'pending' || !account.employeeId) {
      throw new NotFoundException('Account not found');
    }
    if (!(await this.hierarchy.isBelow(admin.employeeId, account.employeeId))) {
      throw new ForbiddenException('You can only change the accounts of people below you');
    }
    const employeeId = account.employeeId;
    const updated = await this.db.$transaction(async (tx) => {
      const after = await tx.account.update({ where: { id: accountId }, data: input });
      // turning an account off signs it out everywhere straight away
      if (input.status === 'disabled') await tx.session.deleteMany({ where: { accountId } });
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (input.isAdmin !== undefined && input.isAdmin !== account.isAdmin) {
        changes.isAdmin = { from: account.isAdmin, to: input.isAdmin };
      }
      if (input.status !== undefined && input.status !== account.status) {
        changes.status = { from: account.status, to: input.status };
      }
      if (Object.keys(changes).length > 0) {
        await this.audit.record(tx, {
          action: 'account.updated',
          actor: actorFrom(admin),
          subject: { employeeId, name: after.name },
          changes,
        });
      }
      return after;
    });
    return summary(updated);
  }

  /** removes a request for an account. only waiting accounts can be rejected */
  async reject(admin: SignedInAccount, accountId: string) {
    await this.db.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      const { count } = await tx.account.deleteMany({
        where: { id: accountId, status: 'pending' },
      });
      if (count === 0 || !account) throw await this.missingOrHandled(accountId);
      await this.audit.record(tx, {
        action: 'account.rejected',
        actor: actorFrom(admin),
        details: { accountName: account.name, accountEmail: account.email },
      });
    });
  }

  private async missingOrHandled(accountId: string) {
    const account = await this.db.account.findUnique({ where: { id: accountId } });
    return account
      ? new ConflictException('Someone has already dealt with this account')
      : new NotFoundException('Account not found');
  }
}
