import type { Employee } from '@hierarchy-hub/shared';

export interface OrgIndex {
  byId: Map<string, Employee>;
  /** direct reports per manager id, sorted by surname */
  reportsOf: (id: string) => Employee[];
  /** people with no manager, usually just the ceo */
  roots: Employee[];
  /** from the top of the org down to this person (inclusive) */
  chainOf: (id: string) => Employee[];
  /** everyone under this person at any depth */
  teamSizeOf: (id: string) => number;
}

const bySurname = (a: Employee, b: Employee) =>
  a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);

/**
 * builds lookups once from the flat list so the explore views don't keep
 * scanning every employee on each render. works fine with thousands of people
 */
export function buildOrgIndex(employees: readonly Employee[]): OrgIndex {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const reports = new Map<string, Employee[]>();
  const roots: Employee[] = [];

  for (const e of employees) {
    // a manager that isn't in the list (shouldn't happen) means treat them as top level
    if (e.managerId && byId.has(e.managerId)) {
      const list = reports.get(e.managerId) ?? [];
      list.push(e);
      reports.set(e.managerId, list);
    } else {
      roots.push(e);
    }
  }
  for (const list of reports.values()) list.sort(bySurname);
  roots.sort(bySurname);

  const teamCache = new Map<string, number>();
  const teamSizeOf = (id: string): number => {
    const cached = teamCache.get(id);
    if (cached !== undefined) return cached;
    // iterative so a deep org can't blow the stack, and `seen` guards against bad data loops
    let count = 0;
    const stack = [...(reports.get(id) ?? [])];
    const seen = new Set<string>([id]);
    while (stack.length) {
      const next = stack.pop() as Employee;
      if (seen.has(next.id)) continue;
      seen.add(next.id);
      count += 1;
      stack.push(...(reports.get(next.id) ?? []));
    }
    teamCache.set(id, count);
    return count;
  };

  const chainOf = (id: string): Employee[] => {
    const chain: Employee[] = [];
    const seen = new Set<string>();
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
      chain.unshift(current);
      seen.add(current.id);
      current = current.managerId ? byId.get(current.managerId) : undefined;
    }
    return chain;
  };

  return {
    byId,
    reportsOf: (id) => reports.get(id) ?? [],
    roots,
    chainOf,
    teamSizeOf,
  };
}
