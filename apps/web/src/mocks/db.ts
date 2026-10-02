import type { Employee } from '@hierarchy-hub/shared';
import { seedEmployees } from './seed';

let rows: Employee[] = [];

/** In-memory table used by the mock API. */
export const db = {
  reset() {
    rows = seedEmployees();
  },
  all(): Employee[] {
    return rows;
  },
  find(id: string): Employee | undefined {
    return rows.find((row) => row.id === id);
  },
  insert(row: Employee) {
    rows = [...rows, row];
  },
  update(id: string, patch: Partial<Employee>): Employee {
    const current = db.find(id);
    if (!current) throw new Error(`No employee ${id}`);
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    rows = rows.map((row) => (row.id === id ? next : row));
    return next;
  },
  remove(id: string) {
    rows = rows.filter((row) => row.id !== id);
  },
};

db.reset();
