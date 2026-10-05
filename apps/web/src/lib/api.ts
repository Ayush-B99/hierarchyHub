import type {
  AccountSummary,
  ApiErrorBody,
  Me,
  SignInInput,
  SignUpInput,
  UpdateAccountInput,
  CreateEmployeeInput,
  Employee,
  HealthResponse,
  ListEmployeesQuery,
  Paginated,
  UpdateEmployeeInput,
} from '@hierarchy-hub/shared';
import { config } from '../config';

/** Thrown for any non-2xx response. `fieldErrors` holds per-field messages for forms. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, body: Partial<ApiErrorBody>) {
    super(body.message ?? `Request failed (${status})`);
    this.status = status;
    this.fieldErrors = body.errors ?? {};
  }

  /** someone else saved this employee after we loaded them (412) */
  get isStale(): boolean {
    return this.status === 412;
  }
}

/** sent on window whenever the api says the session has ended */
export const SIGNED_OUT = 'hierarchy-hub:signed-out';

function toUrl(path: string): string {
  return new URL(`${config.apiUrl}${path}`, window.location.origin).toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(toUrl(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<ApiErrorBody>;
    // the session ended (signed out elsewhere, ran out, or the account was turned off), so
    // let the app know and it shows the sign in page. a wrong password isn't that
    if (response.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event(SIGNED_OUT));
    }
    throw new ApiError(response.status, body);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

function toQueryString(query: Partial<ListEmployeesQuery>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** the etag the api uses for an employee's version, eg "v3" */
const versionTag = (version: number) => `"v${version}"`;

/** Typed client for the REST API described in docs/api/API.md. */
export const api = {
  health: () => request<HealthResponse>('/health'),
  listEmployees: (query: Partial<ListEmployeesQuery> = {}) =>
    request<Paginated<Employee>>(`/employees${toQueryString(query)}`),
  hierarchy: () => request<Employee[]>('/employees/hierarchy'),
  getEmployee: (id: string) => request<Employee>(`/employees/${id}`),
  createEmployee: (input: CreateEmployeeInput) =>
    request<Employee>('/employees', { method: 'POST', body: JSON.stringify(input) }),
  // changes send back the version they were based on, so the api can refuse them (412)
  // if someone else saved in between, instead of quietly overwriting their work
  updateEmployee: (id: string, input: UpdateEmployeeInput, version: number) =>
    request<Employee>(`/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      headers: { 'If-Match': versionTag(version) },
    }),
  deleteEmployee: (id: string, version: number) =>
    request<void>(`/employees/${id}`, {
      method: 'DELETE',
      headers: { 'If-Match': versionTag(version) },
    }),

  // accounts (adr 0016). the session is an httpOnly cookie the browser sends by itself
  me: () => request<Me>('/auth/me'),
  signIn: (input: SignInInput) =>
    request<Me>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  signUp: (input: SignUpInput) =>
    request<{ message: string }>('/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  signOut: () => request<void>('/auth/logout', { method: 'POST' }),
  accounts: () => request<AccountSummary[]>('/accounts'),
  approveAccount: (id: string, employeeId: string) =>
    request<AccountSummary>(`/accounts/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    }),
  rejectAccount: (id: string) => request<void>(`/accounts/${id}/reject`, { method: 'POST' }),
  updateAccount: (id: string, changes: UpdateAccountInput) =>
    request<AccountSummary>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
};
