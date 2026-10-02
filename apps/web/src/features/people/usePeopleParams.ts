import { EMPLOYEE_SORT_FIELDS, type EmployeeSortField } from '@hierarchy-hub/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { BIRTH_BANDS, DEFAULT_FILTERS, PAY_BANDS, type PeopleFilters } from './filters';

// short url names so shared links stay readable, eg ?role=Accountant&sort=salary&dir=desc
const KEYS: Record<keyof PeopleFilters, string> = {
  search: 'q',
  role: 'role',
  pay: 'pay',
  born: 'born',
  manager: 'manager',
  sort: 'sort',
  dir: 'dir',
  page: 'page',
};

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/**
 * reads the filters from the url and writes them back, so a filtered view can be
 * bookmarked or sent to someone. anything odd in the url just falls back to the default
 */
export function usePeopleParams() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<PeopleFilters>(() => {
    const page = Number(params.get(KEYS.page));
    return {
      search: params.get(KEYS.search) ?? DEFAULT_FILTERS.search,
      role: params.get(KEYS.role) ?? DEFAULT_FILTERS.role,
      pay: oneOf(
        params.get(KEYS.pay),
        PAY_BANDS.map((b) => b.value),
        DEFAULT_FILTERS.pay,
      ),
      born: oneOf(
        params.get(KEYS.born),
        BIRTH_BANDS.map((b) => b.value),
        DEFAULT_FILTERS.born,
      ),
      manager: params.get(KEYS.manager) ?? DEFAULT_FILTERS.manager,
      sort: oneOf<EmployeeSortField>(
        params.get(KEYS.sort),
        EMPLOYEE_SORT_FIELDS,
        DEFAULT_FILTERS.sort,
      ),
      dir: params.get(KEYS.dir) === 'desc' ? 'desc' : 'asc',
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }, [params]);

  /** change some filters. anything other than the page jumps back to page 1 */
  const update = useCallback(
    (changes: Partial<PeopleFilters>, options?: { replace?: boolean }) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const merged: Partial<PeopleFilters> = { ...changes };
          if (!('page' in changes)) merged.page = 1;
          for (const [key, value] of Object.entries(merged) as [keyof PeopleFilters, unknown][]) {
            // keep the url tidy by leaving defaults out
            if (value === DEFAULT_FILTERS[key] || value === '') next.delete(KEYS[key]);
            else next.set(KEYS[key], String(value));
          }
          return next;
        },
        { replace: options?.replace },
      );
    },
    [setParams],
  );

  const reset = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams();
        // clearing filters keeps whatever sort you had
        for (const key of [KEYS.sort, KEYS.dir]) {
          const value = prev.get(key);
          if (value) next.set(key, value);
        }
        return next;
      }),
    [setParams],
  );

  return { filters, update, reset };
}
