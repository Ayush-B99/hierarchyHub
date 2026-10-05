import { descendantsOf, type Employee, latestBirthDate } from '@hierarchy-hub/shared';
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogActions } from '../../components/ui/Dialog';
import { api, ApiError } from '../../lib/api';
import { fullName } from '../../lib/format';
import styles from './EmployeeFormDialog.module.css';
import {
  changedFields,
  EMPTY_VALUES,
  FIELD_ORDER,
  fromServerErrors,
  validate,
  valuesFrom,
  type FieldName,
  type FormErrors,
  type FormValues,
} from './formModel';
import { useCreateEmployee, useUpdateEmployee } from './mutations';

interface EmployeeFormDialogProps {
  /** leave out to add someone new */
  employee?: Employee;
  /** everyone, for the manager list and role suggestions */
  everyone: Employee[];
  /** a field to jump straight to, eg the manager for "change manager" */
  focus?: FieldName;
  onClose: () => void;
  onSaved: (employee: Employee, what: 'added' | 'updated' | 'unchanged') => void;
}

/** add or edit an employee. checks everything in the browser first, then shows anything the server says */
export function EmployeeFormDialog({
  employee,
  everyone,
  focus,
  onClose,
  onSaved,
}: EmployeeFormDialogProps) {
  const editing = Boolean(employee);
  // the version of the employee this form is based on. it moves on when you load the latest
  // after a clash, so the next save is checked against what you're actually looking at
  const [base, setBase] = useState<Employee | undefined>(employee);
  const [stale, setStale] = useState(false);
  const [values, setValues] = useState<FormValues>(employee ? valuesFrom(employee) : EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const saving = create.isPending || update.isPending;
  const formRef = useRef<HTMLFormElement>(null);
  const idBase = useId();

  // nobody can manage themselves or someone above them, so grey those people out (br-01, br-02)
  const blocked = useMemo(() => {
    if (!employee) return new Set<string>();
    return new Set([employee.id, ...descendantsOf(employee.id, everyone).map((e) => e.id)]);
  }, [employee, everyone]);

  const managerOptions = useMemo(
    () => [...everyone].sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [everyone],
  );
  const roles = useMemo(() => [...new Set(everyone.map((e) => e.role))].sort(), [everyone]);

  const set = (field: FieldName) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    // once you start fixing a field, stop shouting at you about it
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const focusFirstProblem = (problems: FormErrors) => {
    const first = FIELD_ORDER.find((field) => problems[field]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const { data, errors: problems } = validate(values);
    if (!data) {
      setErrors(problems);
      focusFirstProblem(problems);
      return;
    }

    try {
      if (!base) {
        onSaved(await create.mutateAsync(data), 'added');
        return;
      }
      const changes = changedFields(base, data);
      if (Object.keys(changes).length === 0) {
        onSaved(base, 'unchanged');
        return;
      }
      onSaved(
        await update.mutateAsync({ id: base.id, input: changes, version: base.version }),
        'updated',
      );
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("We couldn't save that. Check your connection and try again.");
        return;
      }
      // someone else saved first. nothing was overwritten, offer to load their version
      if (error.isStale) {
        setStale(true);
        return;
      }
      const serverErrors = fromServerErrors(error.fieldErrors);
      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors);
        focusFirstProblem(serverErrors);
      } else if (/manager/i.test(error.message)) {
        // self manager, loop or missing manager, all belong next to the manager field
        setErrors({ managerId: error.message });
        focusFirstProblem({ managerId: error.message });
      } else {
        setFormError(error.message);
      }
    }
  };

  /** after a clash: swap the form over to the latest saved version so you can edit from there */
  const loadLatest = async () => {
    if (!base) return;
    try {
      const latest = await api.getEmployee(base.id);
      setBase(latest);
      setValues(valuesFrom(latest));
      setErrors({});
      setStale(false);
      formRef.current?.querySelector<HTMLElement>(`[name="${focus ?? 'firstName'}"]`)?.focus();
    } catch (error) {
      setStale(false);
      setFormError(
        error instanceof ApiError && error.status === 404
          ? 'Someone else has deleted this employee.'
          : "We couldn't load the latest version. Please try again.",
      );
    }
  };

  const field = (
    name: FieldName,
    label: string,
    input: ReactNode,
    options?: { full?: boolean; help?: string },
  ) => {
    const errorId = `${idBase}-${name}-error`;
    const helpId = `${idBase}-${name}-help`;
    return (
      <div
        className={[styles.field, options?.full && styles.full, errors[name] && styles.invalid]
          .filter(Boolean)
          .join(' ')}
      >
        <label htmlFor={`${idBase}-${name}`}>{label}</label>
        {input}
        {options?.help && (
          <span id={helpId} className={styles.help}>
            {options.help}
          </span>
        )}
        {errors[name] && (
          <span id={errorId} className={styles.error}>
            {errors[name]}
          </span>
        )}
      </div>
    );
  };

  // shared props for every input so labels, errors and help text are wired up for screen readers
  const inputProps = (name: FieldName, help?: boolean) => ({
    id: `${idBase}-${name}`,
    name,
    value: values[name],
    onChange: set(name),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby':
      [errors[name] && `${idBase}-${name}-error`, help && `${idBase}-${name}-help`]
        .filter(Boolean)
        .join(' ') || undefined,
    'data-autofocus': focus === name ? true : undefined,
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={employee ? `Edit ${employee.firstName}` : 'Add employee'}
      description={
        editing
          ? 'Change any detail, including who they report to.'
          : 'Everything is needed except the manager.'
      }
    >
      <form
        ref={formRef}
        id={`${idBase}-form`}
        className={styles.form}
        onSubmit={submit}
        noValidate
      >
        {formError && (
          <p className={styles.banner} role="alert">
            {formError}
          </p>
        )}
        {stale && base && (
          <div className={styles.banner} role="alert">
            <p className={styles.bannerText}>
              Someone else changed {base.firstName} while you were editing, so your changes weren't
              saved. Load their latest version, then make your change again.
            </p>
            <Button onClick={loadLatest}>Load the latest version</Button>
          </div>
        )}
        {field(
          'firstName',
          'First name',
          <input
            {...inputProps('firstName')}
            autoComplete="off"
            data-autofocus={!focus ? true : undefined}
          />,
        )}
        {field('lastName', 'Surname', <input {...inputProps('lastName')} autoComplete="off" />)}
        {field(
          'email',
          'Email',
          <input {...inputProps('email')} type="email" autoComplete="off" />,
          { full: true },
        )}
        {field(
          'employeeNumber',
          'Employee number',
          <input {...inputProps('employeeNumber')} autoComplete="off" />,
        )}
        {field(
          'birthDate',
          'Birth date',
          <input
            {...inputProps('birthDate')}
            type="date"
            min="1900-01-01"
            // the date picker won't offer anyone under the minimum age (br-07)
            max={latestBirthDate()}
          />,
        )}
        {field(
          'role',
          'Role',
          <>
            <input {...inputProps('role')} list={`${idBase}-roles`} autoComplete="off" />
            <datalist id={`${idBase}-roles`}>
              {roles.map((role) => (
                <option key={role} value={role} />
              ))}
            </datalist>
          </>,
        )}
        {field(
          'salary',
          'Salary (R)',
          <input {...inputProps('salary')} type="number" min="0" step="0.01" inputMode="decimal" />,
        )}
        {field(
          'managerId',
          'Reports to',
          <select {...inputProps('managerId', true)}>
            <option value="">No manager (top of the organisation)</option>
            {managerOptions.map((option) => {
              const why =
                option.id === employee?.id
                  ? ' (this person)'
                  : blocked.has(option.id)
                    ? ' (in their team)'
                    : '';
              return (
                <option key={option.id} value={option.id} disabled={blocked.has(option.id)}>
                  {`${fullName(option)}, ${option.role}${why}`}
                </option>
              );
            })}
          </select>,
          {
            full: true,
            help: employee
              ? `Greyed out people are ${employee.firstName} or someone in their team. Picking them would create a reporting loop.`
              : 'Leave as "No manager" for someone at the very top, like the CEO.',
          },
        )}
      </form>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {/* lives outside the form visually but still submits it, so enter in any field works too */}
        <Button type="submit" form={`${idBase}-form`} variant="primary" disabled={saving}>
          {saving ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
