import type { Employee } from '@hierarchy-hub/shared';
import { useState } from 'react';
import { useToast } from '../../components/feedback/useToast';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogActions } from '../../components/ui/Dialog';
import { ApiError } from '../../lib/api';
import { fullName } from '../../lib/format';
import { useUpdateEmployee } from '../employees/mutations';

interface MoveEmployeeDialogProps {
  employee: Employee;
  from?: Employee;
  to: Employee;
  onClose: () => void;
}

/** a drag never saves by itself, this asks first so a slip of the mouse can't reorganise anyone */
export function MoveEmployeeDialog({ employee, from, to, onClose }: MoveEmployeeDialogProps) {
  const update = useUpdateEmployee();
  const { showToast } = useToast();
  const [failed, setFailed] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const move = async () => {
    setFailed(null);
    try {
      await update.mutateAsync({
        id: employee.id,
        input: { managerId: to.id },
        version: employee.version,
      });
      onClose();
      showToast(`${employee.firstName} now reports to ${fullName(to)}`);
    } catch (error) {
      if (error instanceof ApiError && error.isStale) {
        setStale(true);
        setFailed(
          `Someone else changed ${employee.firstName} a moment ago, so they weren't moved. Close this, check the chart and try again.`,
        );
        return;
      }
      setFailed(
        error instanceof Error ? error.message : "We couldn't move them. Please try again.",
      );
    }
  };

  return (
    <Dialog
      open
      size="small"
      onClose={onClose}
      title={`Move ${fullName(employee)}?`}
      description={
        from
          ? `${employee.firstName} will report to ${fullName(to)} instead of ${fullName(from)}.`
          : `${employee.firstName} will report to ${fullName(to)}.`
      }
    >
      {failed && (
        <p role="alert" style={{ margin: '18px 0 0', fontWeight: 700, color: 'var(--danger)' }}>
          {failed}
        </p>
      )}
      <DialogActions>
        <Button onClick={onClose} data-autofocus>
          Cancel
        </Button>
        <Button variant="primary" onClick={move} disabled={update.isPending || stale}>
          {update.isPending ? 'Moving…' : 'Move'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
