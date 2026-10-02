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

function duplicateOf(input: { email?: string; employeeNumber?: string }, exceptId?: string) {
  return db
    .all()
    .find(
      (row) =>
        row.id !== exceptId &&
        ((input.email && row.email === input.email) ||
          (input.employeeNumber &&
            row.employeeNumber.toLowerCase() === input.employeeNumber.toLowerCase())),
    );
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
    items = [...items].sort((a, b) => {
      const x = valueOf(a);
      const y = valueOf(b);
      const result =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), 'en', { sensitivity: 'base' });
      return result * direction;
    });

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
    return row ? HttpResponse.json(row) : error(404, 'Employee not found');
  }),

  http.post(`${API}/employees`, async ({ request }) => {
    await delay();
    const parsed = createEmployeeSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    if (duplicateOf(input))
      return error(409, 'Another employee already has that email or employee number');
    if (input.managerId && !db.find(input.managerId)) return error(404, 'Manager not found');

    const now = new Date().toISOString();
    const row: Employee = {
      ...input,
      managerId: input.managerId ?? null,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    db.insert(row);
    return HttpResponse.json(row, { status: 201 });
  }),

  http.patch(`${API}/employees/:id`, async ({ params, request }) => {
    await delay();
    const id = String(params.id);
    if (!db.find(id)) return error(404, 'Employee not found');

    const parsed = updateEmployeeSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    if (input.managerId) {
      if (input.managerId === id) return error(400, 'An employee cannot be their own manager');
      if (!db.find(input.managerId)) return error(404, 'Manager not found');
      if (wouldCreateCycle(id, input.managerId, managerOf)) {
        return error(
          400,
          'This person reports to the employee you are editing, so they cannot be their manager',
        );
      }
    }
    if (duplicateOf(input, id))
      return error(409, 'Another employee already has that email or employee number');

    return HttpResponse.json(db.update(id, input));
  }),

  http.delete(`${API}/employees/:id`, async ({ params }) => {
    await delay();
    const id = String(params.id);
    const row = db.find(id);
    if (!row) return error(404, 'Employee not found');
    // BR-04: direct reports move up to the deleted employee's manager.
    for (const report of db.all().filter((e) => e.managerId === id)) {
      db.update(report.id, { managerId: row.managerId });
    }
    db.remove(id);
    return new HttpResponse(null, { status: 204 });
  }),
];
