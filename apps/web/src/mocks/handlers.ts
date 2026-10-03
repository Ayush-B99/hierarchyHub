import { http, HttpResponse, delay } from 'msw';
import {
  createEmployeeSchema,
  listEmployeesQuerySchema,
  updateEmployeeSchema,
  wouldCreateCycle,
  type ApiErrorBody,
  type Employee,
  type HealthResponse,
} from '@hierarchy-hub/shared';
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
 * missing is 428, malformed is 400, an old version is 412, and * skips the check
 */
function versionProblem(ifMatch: string | null, row: Employee | undefined) {
  if (!ifMatch) {
    return error(428, 'Send the If-Match header with the version you loaded, eg If-Match: "v3"');
  }
  if (ifMatch.trim() === '*') return null;
  const version = /^(?:W\/)?"v(\d{1,9})"$/.exec(ifMatch.trim())?.[1];
  if (!version) return error(400, 'If-Match must look like "v3"');
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
export const handlers = [
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
    return HttpResponse.json(db.all());
  }),

  http.get(`${API}/employees`, async ({ request }) => {
    await delay();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = listEmployeesQuerySchema.safeParse(params);
    if (!parsed.success) return validationError(parsed.error);
    const q = parsed.data;

    const term = q.search?.toLowerCase();
    let items = db.all().filter((e) => {
      if (term) {
        const haystack = `${e.firstName} ${e.lastName} ${e.email} ${e.employeeNumber} ${e.role}`;
        if (!haystack.toLowerCase().includes(term)) return false;
      }
      if (q.role && e.role.toLowerCase() !== q.role.toLowerCase()) return false;
      if (q.managerId && e.managerId !== q.managerId) return false;
      if (q.salaryMin !== undefined && e.salary < q.salaryMin) return false;
      if (q.salaryMax !== undefined && e.salary > q.salaryMax) return false;
      if (q.bornAfter && e.birthDate < q.bornAfter) return false;
      if (q.bornBefore && e.birthDate > q.bornBefore) return false;
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
      items: items.slice(start, start + q.pageSize),
      total: items.length,
      page: q.page,
      pageSize: q.pageSize,
    });
  }),

  http.get(`${API}/employees/:id`, async ({ params }) => {
    await delay();
    const row = db.find(String(params.id));
    if (!row) return error(404, 'Employee not found');
    return HttpResponse.json(row, { headers: { ETag: etagFor(row) } });
  }),

  http.post(`${API}/employees`, async ({ request }) => {
    await delay();
    // strict, like the real api: unknown fields such as id or version are refused
    const parsed = createEmployeeSchema.strict().safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    const duplicate = duplicateProblem(input);
    if (duplicate) return duplicate;
    if (input.managerId && !db.find(input.managerId)) {
      return fieldError(404, 'managerId', 'That manager no longer exists');
    }

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
    // br-04: direct reports move up to the deleted employee's manager
    for (const report of db.all().filter((e) => e.managerId === id)) {
      db.update(report.id, { managerId: row.managerId });
    }
    db.remove(id);
    return new HttpResponse(null, { status: 204 });
  }),
];
