import type { Employee } from '@hierarchy-hub/shared';

const HEADERS = [
  'Employee number',
  'First name',
  'Surname',
  'Email',
  'Birth date',
  'Role',
  'Salary',
  'Reports to',
  'Manager employee number',
];

/**
 * wraps a value for csv. quotes anything with commas, quotes or new lines, and
 * puts a ' in front of values starting with = + - @ so spreadsheet apps don't run them as formulas
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** builds the csv text for a list of employees */
export function toCsv(employees: readonly Employee[], byId: ReadonlyMap<string, Employee>): string {
  const rows = employees.map((e) => {
    const manager = e.managerId ? byId.get(e.managerId) : undefined;
    return [
      e.employeeNumber,
      e.firstName,
      e.lastName,
      e.email,
      e.birthDate ?? '',
      e.role,
      // left blank when you aren't allowed to see it
      e.salary === null ? '' : e.salary.toFixed(2),
      manager ? `${manager.firstName} ${manager.lastName}` : '',
      manager?.employeeNumber ?? '',
    ]
      .map(csvCell)
      .join(',');
  });
  // the bom at the start helps excel open the file as utf-8 (names with accents etc)
  return `\uFEFF${[HEADERS.join(','), ...rows].join('\r\n')}\r\n`;
}

/** hands the csv to the browser as a download */
export function downloadCsv(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // give the browser a moment to start the download before freeing the memory
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
