import type { EmployeeSortField, ListEmployeesQuery } from '@hierarchy-hub/shared';

/** salary choices in the sentence, each one maps to a min and/or max for the api */
export const PAY_BANDS = [
  { value: 'any', label: 'any salary' },
  { value: 'under-50k', label: 'under R 50 000', max: 49_999.99 },
  { value: '50k-100k', label: 'R 50 000 to R 100 000', min: 50_000, max: 100_000 },
  { value: 'over-100k', label: 'over R 100 000', min: 100_000.01 },
] as const;

/** birth date choices, mapped to inclusive date ranges */
export const BIRTH_BANDS = [
  { value: 'any', label: 'in any year' },
  { value: 'before-1980', label: 'before 1980', before: '1979-12-31' },
  { value: '1980s', label: 'in the 1980s', after: '1980-01-01', before: '1989-12-31' },
  { value: '1990s', label: 'in the 1990s', after: '1990-01-01', before: '1999-12-31' },
  { value: '2000-on', label: 'in 2000 or later', after: '2000-01-01' },
] as const;

export type PayBand = (typeof PAY_BANDS)[number]['value'];
export type BirthBand = (typeof BIRTH_BANDS)[number]['value'];

export const PAGE_SIZE = 10;

/** everything the people page can be set to, all of it lives in the url */
export interface PeopleFilters {
  search: string;
  role: string; // 'any' or an exact role
  pay: PayBand;
  born: BirthBand;
  manager: string; // 'anyone' or a manager id
  sort: EmployeeSortField;
  dir: 'asc' | 'desc';
  page: number;
}

export const DEFAULT_FILTERS: PeopleFilters = {
  search: '',
  role: 'any',
  pay: 'any',
  born: 'any',
  manager: 'anyone',
  sort: 'lastName',
  dir: 'asc',
  page: 1,
};

/** true when any of the sentence or search filters are switched on */
export function hasActiveFilters(f: PeopleFilters): boolean {
  return (
    f.search !== '' ||
    f.role !== 'any' ||
    f.pay !== 'any' ||
    f.born !== 'any' ||
    f.manager !== 'anyone'
  );
}

/** turns the page's filters into an api query, without paging */
export function toApiQuery(f: PeopleFilters): Partial<ListEmployeesQuery> {
  const pay = PAY_BANDS.find((b) => b.value === f.pay);
  const born = BIRTH_BANDS.find((b) => b.value === f.born);
  return {
    search: f.search || undefined,
    role: f.role === 'any' ? undefined : f.role,
    managerId: f.manager === 'anyone' ? undefined : f.manager,
    salaryMin: pay && 'min' in pay ? pay.min : undefined,
    salaryMax: pay && 'max' in pay ? pay.max : undefined,
    bornAfter: born && 'after' in born ? born.after : undefined,
    bornBefore: born && 'before' in born ? born.before : undefined,
    sortBy: f.sort,
    sortOrder: f.dir,
  };
}
