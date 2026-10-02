import { useQuery } from '@tanstack/react-query';
import type { ListEmployeesQuery } from '@hierarchy-hub/shared';
import { api } from '../../lib/api';

/** Query keys in one place, so mutations can refresh the right data later. */
export const employeeKeys = {
  all: ['employees'] as const,
  hierarchy: () => [...employeeKeys.all, 'hierarchy'] as const,
  list: (query: Partial<ListEmployeesQuery>) => [...employeeKeys.all, 'list', query] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
};

/** Every employee as a flat list. Used to build the org chart. */
export function useHierarchy() {
  return useQuery({ queryKey: employeeKeys.hierarchy(), queryFn: api.hierarchy });
}

export function useEmployees(query: Partial<ListEmployeesQuery>) {
  return useQuery({
    queryKey: employeeKeys.list(query),
    queryFn: () => api.listEmployees(query),
    placeholderData: (previous) => previous,
  });
}
