import type {
  ApiErrorBody,
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
}

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

/** Typed client for the REST API described in docs/api/API.md. */
export const api = {
  health: () => request<HealthResponse>('/health'),
  listEmployees: (query: Partial<ListEmployeesQuery> = {}) =>
    request<Paginated<Employee>>(`/employees${toQueryString(query)}`),
  hierarchy: () => request<Employee[]>('/employees/hierarchy'),
  getEmployee: (id: string) => request<Employee>(`/employees/${id}`),
  createEmployee: (input: CreateEmployeeInput) =>
    request<Employee>('/employees', { method: 'POST', body: JSON.stringify(input) }),
  updateEmployee: (id: string, input: UpdateEmployeeInput) =>
    request<Employee>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteEmployee: (id: string) => request<void>(`/employees/${id}`, { method: 'DELETE' }),
};
