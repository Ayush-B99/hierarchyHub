import type { ListEmployeesQuery } from '../employee/employee';

/**
 * the api contract for listing employees, written as examples against the 14 sample people
 * (apps/web/src/mocks/seed.ts and apps/api/prisma/seed-data.ts hold the same people)
 *
 * the mock api's tests and the real api's tests both run every one of these, so if the two
 * ever sort, filter or page differently, a test fails
 */
export interface ListScenario {
  name: string;
  query: Partial<ListEmployeesQuery>;
  /** surnames in the order they should come back */
  lastNames: string[];
  total: number;
}

const JOHAN = '00000000-0000-4000-8000-000000000005';

export const LIST_SCENARIOS: ListScenario[] = [
  {
    name: 'everyone, sorted by surname',
    query: {},
    lastNames: [
      'Adams',
      'Botha',
      'Dlamini',
      'Fourie',
      'Khumalo',
      'Mokoena',
      'Molefe',
      'Mthembu',
      'Naidoo',
      'Nkosi',
      'Patel',
      'Sithole',
      'van der Merwe',
      'Zulu',
    ],
    total: 14,
  },
  {
    name: 'second page of five',
    query: { page: 2, pageSize: 5 },
    lastNames: ['Mokoena', 'Molefe', 'Mthembu', 'Naidoo', 'Nkosi'],
    total: 14,
  },
  {
    name: 'a page past the end is empty, the total is still right',
    query: { page: 9, pageSize: 5 },
    lastNames: [],
    total: 14,
  },
  {
    name: 'search by surname, any case',
    query: { search: 'NAIDOO' },
    lastNames: ['Naidoo'],
    total: 1,
  },
  {
    name: 'search by employee number',
    query: { search: 'emp-0012' },
    lastNames: ['Sithole'],
    total: 1,
  },
  { name: 'search by email', query: { search: 'zulu@' }, lastNames: ['Zulu'], total: 1 },
  {
    name: 'search by part of a role',
    query: { search: 'chief' },
    lastNames: ['Dlamini', 'Nkosi', 'Patel'],
    total: 3,
  },
  // % and _ are wildcards in sql, they have to be searched for as plain characters
  {
    name: 'wildcard characters are treated as plain text',
    query: { search: '%' },
    lastNames: [],
    total: 0,
  },
  { name: 'underscores are plain text too', query: { search: '_' }, lastNames: [], total: 0 },
  {
    name: 'exact role, any case, by salary high to low',
    query: { role: 'software engineer', sortBy: 'salary', sortOrder: 'desc' },
    lastNames: ['Mthembu', 'Molefe'],
    total: 2,
  },
  {
    name: 'direct reports of a manager',
    query: { managerId: JOHAN },
    lastNames: ['Botha', 'Molefe', 'Mthembu', 'Naidoo'],
    total: 4,
  },
  {
    name: 'salary range, both ends included',
    query: { salaryMin: 51000, salaryMax: 58000, sortBy: 'salary' },
    lastNames: ['Molefe', 'Mthembu', 'Fourie'],
    total: 3,
  },
  {
    name: 'born in the 1990s',
    query: { bornAfter: '1990-01-01', bornBefore: '1999-12-31', sortBy: 'birthDate' },
    lastNames: ['Botha', 'Adams', 'Fourie', 'Naidoo', 'Sithole', 'Mthembu', 'Molefe', 'Zulu'],
    total: 8,
  },
  {
    name: 'by manager name, people with no manager first, ties by surname',
    query: { sortBy: 'managerName', pageSize: 4 },
    lastNames: ['Nkosi', 'Khumalo', 'van der Merwe', 'Fourie'],
    total: 14,
  },
  {
    name: 'by manager name, backwards, people with no manager last',
    query: { sortBy: 'managerName', sortOrder: 'desc', pageSize: 2 },
    lastNames: ['Botha', 'Molefe'],
    total: 14,
  },
  {
    name: 'by employee number, backwards',
    query: { sortBy: 'employeeNumber', sortOrder: 'desc', pageSize: 3 },
    lastNames: ['Zulu', 'Adams', 'Sithole'],
    total: 14,
  },
  {
    name: 'filters combine',
    query: {
      managerId: JOHAN,
      salaryMin: 50000,
      search: 'engineer',
      sortBy: 'salary',
      sortOrder: 'desc',
    },
    lastNames: ['Botha', 'Mthembu', 'Molefe'],
    total: 3,
  },
];
