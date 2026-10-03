import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../components/feedback/useToast';
import { fullName } from '../../lib/format';
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog';
import { EmployeeDialogsContext } from './EmployeeDialogsContext';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import type { FieldName } from './formModel';
import { useHierarchy } from './queries';

type Open =
  | { kind: 'add' }
  | { kind: 'edit'; id: string; focus?: FieldName }
  | { kind: 'delete'; id: string }
  | null;

/** owns the add, edit and delete popups so any page or button can open them */
export function EmployeeDialogsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open>(null);
  const { data: everyone = [] } = useHierarchy();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const close = useCallback(() => setOpen(null), []);
  const value = useMemo(
    () => ({
      openAdd: () => setOpen({ kind: 'add' }),
      openEdit: (id: string, focus?: FieldName) => setOpen({ kind: 'edit', id, focus }),
      openDelete: (id: string) => setOpen({ kind: 'delete', id }),
    }),
    [],
  );

  const target = open && open.kind !== 'add' ? everyone.find((e) => e.id === open.id) : undefined;

  return (
    <EmployeeDialogsContext.Provider value={value}>
      {children}

      {open?.kind === 'add' && (
        <EmployeeFormDialog
          everyone={everyone}
          onClose={close}
          onSaved={(employee) => {
            close();
            showToast(`Added ${fullName(employee)}`);
            // take you straight to the new person so you can see where they landed
            navigate(`/?person=${employee.id}`);
          }}
        />
      )}

      {open?.kind === 'edit' && target && (
        <EmployeeFormDialog
          employee={target}
          everyone={everyone}
          focus={open.focus}
          onClose={close}
          onSaved={(employee, what) => {
            close();
            showToast(
              what === 'unchanged' ? 'Nothing changed' : `Saved ${employee.firstName}'s changes`,
            );
          }}
        />
      )}

      {open?.kind === 'delete' && target && (
        <DeleteEmployeeDialog
          employee={target}
          manager={everyone.find((e) => e.id === target.managerId)}
          directReports={everyone.filter((e) => e.managerId === target.id).length}
          onClose={close}
          onDeleted={(employee) => {
            close();
            showToast(`Deleted ${fullName(employee)}`);
            // show where their team went, or the top of the org if they were the top
            navigate(employee.managerId ? `/?person=${employee.managerId}` : '/', {
              replace: true,
            });
          }}
        />
      )}
    </EmployeeDialogsContext.Provider>
  );
}
