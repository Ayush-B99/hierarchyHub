import { http, HttpResponse, delay } from 'msw';
import {
  approveAccountSchema,
  canBeTheirManager,
  createEmployeeSchema,
  descendantsOf,
  fieldsYouCantChangeAboutYourself,
  isBelow,
  updateAccountSchema,
  signInSchema,
  signUpSchema,
  SIGN_UP_RECEIVED,
  listEmployeesQuerySchema,
  updateEmployeeSchema,
  wouldCreateCycle,
  type ApiErrorBody,
  type Employee,
  type HealthResponse,
} from '@hierarchy-hub/shared';
import { accounts } from './accounts';
import { db } from './db';

const API = '*/api';

function error(statusCode: number, message: string, errors?: ApiErrorBody['errors']) {
  return HttpResponse.json<ApiErrorBody>({ statusCode, message, errors }, { status: statusCode });
}

interface FlattenableError {
  flatten(): { fieldErrors: Record<string, string[] | undefined> };
}

function validationError(zodError: FlattenableError) {
  const fieldErrors = zodError.flatten().fieldErrors as Record<string, string[]>;
  return error(400, 'Validation failed', fieldErrors);
}

function fieldError(statusCode: number, field: string, message: string) {
  return error(statusCode, message, { [field]: [message] });
}

/** a 409 on the right field when the email or employee number is already taken, like the real api */
function duplicateProblem(input: { email?: string; employeeNumber?: string }, exceptId?: string) {
  const others = db.all().filter((row) => row.id !== exceptId);
  if (input.email && others.some((row) => row.email === input.email)) {
    return fieldError(409, 'email', 'Another employee already has that email address');
  }
  if (input.employeeNumber && others.some((row) => row.employeeNumber === input.employeeNumber)) {
    return fieldError(409, 'employeeNumber', 'Another employee already has that employee number');
  }
  return null;
}

const etagFor = (row: Employee) => `"v${row.version}"`;

/**
 * the same If-Match rules as the real api (apps/api/src/common/if-match.ts):
 * missing is 428, anything but an exact version (including * and weak tags) is 400, and an
 * old version is 412
 */
function versionProblem(ifMatch: string | null, row: Employee | undefined) {
  if (!ifMatch) {
    return error(428, 'Send the If-Match header with the version you loaded, eg If-Match: "v3"');
  }
  const version = /^"v(\d{1,9})"$/.exec(ifMatch.trim())?.[1];
  if (!version) return error(400, 'If-Match must be the exact version you loaded, eg "v3"');
  if (row && Number(version) !== row.version) {
    return error(
      412,
      'Someone else changed this employee while you were editing. Reload to see their changes, then try again.',
    );
  }
  return null;
}

const managerOf = (id: string) => db.find(id)?.managerId;

/** Mock implementation of docs/api/API.md, including business rules BR-01 to BR-05. */
// adding and deleting people is for admins. everyone can send changes, then the same rules
// as the real api decide who may change whom (apps/api/src/employees/employees.service.ts)
const ADMIN_ONLY = new Set(['POST', 'DELETE']);

/** the signed in person. the guard in front of every employee route makes sure there is one */
const viewer = () => accounts.me()!;
const everyoneById = () => new Map(db.all().map((e) => [e.id, e]));

/** you see your own salary and birth date, and those of everyone below you (adr 0017) */
function visibleTo(employeeId: string): Set<string> {
  return new Set([employeeId, ...descendantsOf(employeeId, db.all()).map((e) => e.id)]);
}
const shown = (e: Employee, visible: Set<string>): Employee =>
  visible.has(e.id) ? e : { ...e, salary: null, birthDate: null };

function managerProblem(managerId: string | null) {
  if (managerId !== null && !db.find(managerId)) {
    return fieldError(404, 'managerId', 'That manager no longer exists');
  }
  if (!canBeTheirManager(viewer(), managerId, everyoneById())) {
    return fieldError(
      403,
      'managerId',
      managerId === null
        ? 'Only someone at the top of the organisation can put people at the top'
        : 'You can only choose yourself or someone below you as their manager',
    );
  }
  return null;
}

/** the same sign in rules as the real api (apps/api/src/auth/session.guard.ts) */
function signInProblem(adminOnly: boolean) {
  const me = accounts.me();
  if (!me) return error(401, 'Please sign in.');
  if (adminOnly && !me.isAdmin) return error(403, 'Only admins can do that.');
  return undefined;
}

const authHandlers = [
  // every employee route needs a signed in account, and for now only admins change anyone.
  // returning nothing passes the request on to the handlers below
  http.all(`${API}/employees*`, ({ request }) => signInProblem(ADMIN_ONLY.has(request.method))),
  http.all(`${API}/accounts*`, () => signInProblem(true)),

  http.get(`${API}/auth/me`, () => {
    const me = accounts.me();
    return me ? HttpResponse.json(me) : error(401, 'Please sign in.');
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const parsed = signInSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const row = accounts.byEmail(parsed.data.email);
    if (!row || row.password !== parsed.data.password)
      return error(401, 'Email or password is wrong.');
    if (row.status === 'pending')
      return error(403, 'Your account is waiting for an admin to approve it.');
    if (row.status !== 'active') {
      return error(
        403,
        'This account has been turned off. Ask an admin if you think that’s wrong.',
      );
    }
    accounts.start(row.id);
    return HttpResponse.json(accounts.me());
  }),

  http.post(`${API}/auth/signup`, async ({ request }) => {
    const parsed = signUpSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    if (!accounts.byEmail(parsed.data.email)) {
      accounts.add(parsed.data.name, parsed.data.email, parsed.data.password);
    }
    return HttpResponse.json({ message: SIGN_UP_RECEIVED }, { status: 202 });
  }),

  http.post(`${API}/auth/logout`, () => {
    if (!accounts.me()) return error(401, 'Please sign in.');
    accounts.end();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/accounts`, () => {
    const me = accounts.me()!;
    const team = new Set(descendantsOf(me.employeeId, db.all()).map((e) => e.id));
    return HttpResponse.json(
      accounts
        .all()
        .filter(
          (a) =>
            a.status === 'pending' ||
            (a.employeeId && (team.has(a.employeeId) || a.employeeId === me.employeeId)),
        ),
    );
  }),

  http.post(`${API}/accounts/:id/approve`, async ({ params, request }) => {
    const me = accounts.me()!;
    const parsed = approveAccountSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const { employeeId } = parsed.data;
    if (!db.find(employeeId))
      return fieldError(404, 'employeeId', 'That employee no longer exists');
    if (!descendantsOf(me.employeeId, db.all()).some((e) => e.id === employeeId)) {
      return fieldError(403, 'employeeId', 'You can only link accounts to people below you');
    }
    if (accounts.all().some((a) => a.employeeId === employeeId)) {
      return fieldError(409, 'employeeId', 'That employee already has an account');
    }
    const row = accounts.find(String(params.id));
    if (!row) return error(404, 'Account not found');
    if (row.status !== 'pending') return error(409, 'Someone has already dealt with this account');
    return HttpResponse.json(accounts.approve(row.id, employeeId));
  }),

  http.patch(`${API}/accounts/:id`, async ({ params, request }) => {
    const parsed = updateAccountSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const row = accounts.find(String(params.id));
    if (!row || row.status === 'pending' || !row.employeeId) return error(404, 'Account not found');
    if (!isBelow(viewer().employeeId, row.employeeId, everyoneById())) {
      return error(403, 'You can only change the accounts of people below you');
    }
    return HttpResponse.json(accounts.update(row.id, parsed.data));
  }),

  http.post(`${API}/accounts/:id/reject`, ({ params }) => {
    const row = accounts.find(String(params.id));
    if (!row) return error(404, 'Account not found');
    if (row.status !== 'pending') return error(409, 'Someone has already dealt with this account');
    accounts.remove(row.id);
    return new HttpResponse(null, { status: 204 });
  }),
];

export const handlers = [
  ...authHandlers,

  http.get(`${API}/health`, () =>
    HttpResponse.json<HealthResponse>({
      status: 'ok',
      service: 'hierarchy-hub-mock-api',
      version: '0.0.0',
      timestamp: new Date().toISOString(),
    }),
  ),

  http.get(`${API}/employees/hierarchy`, async () => {
    await delay();
    const visible = visibleTo(viewer().employeeId);
    return HttpResponse.json(db.all().map((e) => shown(e, visible)));
  }),

  http.get(`${API}/employees`, async ({ request }) => {
    await delay();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = listEmployeesQuerySchema.safeParse(params);
    if (!parsed.success) return validationError(parsed.error);
    const q = parsed.data;

    const visible = visibleTo(viewer().employeeId);
    // filtering or sorting by salary or birth date only looks at people you're allowed to see
    const usesPrivate =
      q.salaryMin !== undefined ||
      q.salaryMax !== undefined ||
      q.bornAfter !== undefined ||
      q.bornBefore !== undefined ||
      q.sortBy === 'salary' ||
      q.sortBy === 'birthDate';
    const term = q.search?.toLowerCase();
    let items = db.all().filter((e) => {
      if (usesPrivate && !visible.has(e.id)) return false;
      if (term) {
        const haystack = `${e.firstName} ${e.lastName} ${e.email} ${e.employeeNumber} ${e.role}`;
        if (!haystack.toLowerCase().includes(term)) return false;
      }
      if (q.role && e.role.toLowerCase() !== q.role.toLowerCase()) return false;
      if (q.managerId && e.managerId !== q.managerId) return false;
      if (q.salaryMin !== undefined && (e.salary ?? 0) < q.salaryMin) return false;
      if (q.salaryMax !== undefined && (e.salary ?? 0) > q.salaryMax) return false;
      if (q.bornAfter && (e.birthDate ?? '') < q.bornAfter) return false;
      if (q.bornBefore && (e.birthDate ?? '') > q.bornBefore) return false;
      return true;
    });

    const direction = q.sortOrder === 'asc' ? 1 : -1;
    // the manager's name isn't on the row itself, so look it up (empty sorts first)
    const managerName = (e: Employee) => {
      const manager = e.managerId ? db.find(e.managerId) : undefined;
      return manager ? `${manager.lastName} ${manager.firstName}` : '';
    };
    const valueOf = (e: Employee) => (q.sortBy === 'managerName' ? managerName(e) : e[q.sortBy]);
    const compare = (x: unknown, y: unknown) =>
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), 'en', { sensitivity: 'base' });
    items = [...items].sort(
      (a, b) =>
        compare(valueOf(a), valueOf(b)) * direction ||
        // ties always go by surname, first name then id, the same as the real api
        compare(a.lastName, b.lastName) ||
        compare(a.firstName, b.firstName) ||
        compare(a.id, b.id),
    );

    const start = (q.page - 1) * q.pageSize;
    return HttpResponse.json({
      items: items.slice(start, start + q.pageSize).map((e) => shown(e, visible)),
      total: items.length,
      page: q.page,
      pageSize: q.pageSize,
    });
  }),

  http.get(`${API}/employees/:id`, async ({ params }) => {
    await delay();
    const row = db.find(String(params.id));
    if (!row) return error(404, 'Employee not found');
    return HttpResponse.json(shown(row, visibleTo(viewer().employeeId)), {
      headers: { ETag: etagFor(row) },
    });
  }),

  http.post(`${API}/employees`, async ({ request }) => {
    await delay();
    // strict, like the real api: unknown fields such as id or version are refused
    const parsed = createEmployeeSchema.strict().safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    const outOfReach = managerProblem(input.managerId ?? null);
    if (outOfReach) return outOfReach;
    const duplicate = duplicateProblem(input);
    if (duplicate) return duplicate;

    const now = new Date().toISOString();
    const row: Employee = {
      ...input,
      managerId: input.managerId ?? null,
      id: crypto.randomUUID(),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(row);
    return HttpResponse.json(row, {
      status: 201,
      headers: { ETag: etagFor(row), Location: `/api/employees/${row.id}` },
    });
  }),

  http.patch(`${API}/employees/:id`, async ({ params, request }) => {
    await delay();
    const id = String(params.id);
    const ifMatch = request.headers.get('If-Match');

    const parsed = updateEmployeeSchema.strict().safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    if (Object.keys(input).length === 0) {
      return error(400, 'Validation failed', { _: ['Send at least one field to change'] });
    }

    const current = db.find(id);
    const versionCheck = versionProblem(ifMatch, current);
    if (versionCheck) return versionCheck;
    if (!current) return error(404, 'Employee not found');

    // about yourself, only your name and email. anyone else, only if they're below you
    const me = viewer();
    if (id === me.employeeId) {
      const blocked = fieldsYouCantChangeAboutYourself(input);
      if (blocked.length > 0) {
        const message = 'You can only change your own name and email';
        return error(403, message, Object.fromEntries(blocked.map((f) => [f, [message]])));
      }
    } else if (!isBelow(me.employeeId, id, everyoneById())) {
      return error(403, 'You can only change people below you in the organisation');
    }
    if (input.managerId !== undefined) {
      const outOfReach = managerProblem(input.managerId);
      if (outOfReach) return outOfReach;
    }

    if (input.managerId) {
      if (input.managerId === id)
        return fieldError(400, 'managerId', "An employee can't be their own manager");
      if (!db.find(input.managerId))
        return fieldError(404, 'managerId', 'That manager no longer exists');
      if (wouldCreateCycle(id, input.managerId, managerOf)) {
        return fieldError(
          400,
          'managerId',
          "This person reports to the employee you're editing, so they can't be their manager",
        );
      }
    }
    const duplicate = duplicateProblem(input, id);
    if (duplicate) return duplicate;

    const row = db.update(id, input);
    return HttpResponse.json(row, { headers: { ETag: etagFor(row) } });
  }),

  http.delete(`${API}/employees/:id`, async ({ params, request }) => {
    await delay();
    const id = String(params.id);
    const row = db.find(id);
    const versionCheck = versionProblem(request.headers.get('If-Match'), row);
    if (versionCheck) return versionCheck;
    if (!row) return error(404, 'Employee not found');
    if (!isBelow(viewer().employeeId, id, everyoneById())) {
      return error(403, 'You can only change people below you in the organisation');
    }
    // br-04: direct reports move up to the deleted employee's manager
    for (const report of db.all().filter((e) => e.managerId === id)) {
      db.update(report.id, { managerId: row.managerId });
    }
    db.remove(id);
    return new HttpResponse(null, { status: 204 });
  }),
];
