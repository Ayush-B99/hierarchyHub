import { LIST_SCENARIOS } from '@hierarchy-hub/shared/testing';
import { describe, expect, it } from 'vitest';
import { api } from '../lib/api';

// the same examples run against the real api in apps/api/test/employees-read.e2e-spec.ts,
// so the mock the frontend was built against can't quietly drift from the real thing
describe('mock api follows the shared contract', () => {
  it.each(LIST_SCENARIOS)('$name', async ({ query, lastNames, total }) => {
    const page = await api.listEmployees(query);
    expect(page.items.map((e) => e.lastName)).toEqual(lastNames);
    expect(page.total).toBe(total);
  });
});
