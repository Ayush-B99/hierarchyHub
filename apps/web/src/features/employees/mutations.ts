import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@hierarchy-hub/shared';
import { api } from '../../lib/api';
import { employeeKeys } from './queries';

// every change can affect the chart, the table, team counts and so on,
// so after any of them we just refresh all employee data

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => api.createEmployee(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) =>
      api.updateEmployee(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteEmployee(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}
