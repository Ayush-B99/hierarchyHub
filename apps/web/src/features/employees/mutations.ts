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

/** version is the one the change is based on, the api refuses it (412) if someone saved since */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
      version,
    }: {
      id: string;
      input: UpdateEmployeeInput;
      version: number;
    }) => api.updateEmployee(id, input, version),
    // refresh on failure too: a 412 means our copy is out of date
    onSettled: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.deleteEmployee(id, version),
    onSettled: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}
