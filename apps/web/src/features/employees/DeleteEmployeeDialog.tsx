import type { Employee } from '@hierarchy-hub/shared';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogActions } from '../../components/ui/Dialog';
import { fullName, plural } from '../../lib/format';
import { useDeleteEmployee } from './mutations';

interface DeleteEmployeeDialogProps {
  employee: Employee;
  manager?: Employee;
  directReports: number;
  onClose: () => void;
  onDeleted: (employee: Employee) => void;
}

/** asks before deleting, and says exactly who moves where so nothing is a surprise (br-04) */
export function DeleteEmployeeDialog({
  employee,
  manager,
  directReports,
  onClose,
  onDeleted,
}: DeleteEmployeeDialogProps) {
  const remove = useDeleteEmployee();
  const [failed, setFailed] = useState<string | null>(null);

  let consequence = `Nobody reports to ${employee.firstName}, so nobody else is affected.`;
  if (directReports > 0) {
    consequence = manager
      ? `${plural(directReports, 'person reports', 'people report')} to ${employee.firstName}. They'll move to ${fullName(manager)}.`
      : `${plural(directReports, 'person reports', 'people report')} to ${employee.firstName}. They'll become top level.`;
  }

  const confirm = async () => {
    setFailed(null);
    try {
      await remove.mutateAsync(employee.id);
      onDeleted(employee);
    } catch (error) {
      setFailed(
        error instanceof Error ? error.message : "We couldn't delete them. Please try again.",
      );
    }
  };

  return (
    <Dialog
      open
      size="small"
      onClose={onClose}
      title={`Delete ${fullName(employee)}?`}
      description={`${consequence} This can't be undone.`}
    >
      {failed && (
        <p role="alert" style={{ margin: '18px 0 0', fontWeight: 700, color: 'var(--danger)' }}>
          {failed}
        </p>
      )}
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} disabled={remove.isPending}>
          {remove.isPending ? 'Deleting…' : 'Delete employee'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
