import type { Employee } from '@hierarchy-hub/shared';

export const MAX_RESULTS = 8;

/**
 * finds people by name, role, email or employee number
 * names that start with what you typed come first, then any other match
 */
export function searchPeople(everyone: readonly Employee[], query: string): Employee[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  const scored: { employee: Employee; score: number }[] = [];
  for (const employee of everyone) {
    const name = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    let score = -1;
    if (name.startsWith(term) || employee.lastName.toLowerCase().startsWith(term)) score = 0;
    else if (name.includes(term)) score = 1;
    else if (employee.employeeNumber.toLowerCase().includes(term)) score = 2;
    else if (employee.role.toLowerCase().includes(term)) score = 3;
    else if (employee.email.toLowerCase().includes(term)) score = 4;
    if (score >= 0) scored.push({ employee, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.employee.lastName.localeCompare(b.employee.lastName))
    .slice(0, MAX_RESULTS)
    .map((s) => s.employee);
}

/** splits text around the part that matched, so it can be shown in bold */
export function splitMatch(text: string, query: string): [string, string, string] {
  const term = query.trim().toLowerCase();
  const at = term ? text.toLowerCase().indexOf(term) : -1;
  if (at < 0) return [text, '', ''];
  return [text.slice(0, at), text.slice(at, at + term.length), text.slice(at + term.length)];
}
