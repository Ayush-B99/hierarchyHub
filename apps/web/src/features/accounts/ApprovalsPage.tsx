import { descendantsOf, type AccountSummary, type Employee } from '@hierarchy-hub/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useToast } from '../../components/feedback/useToast';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { api, ApiError } from '../../lib/api';
import { formatDate, fullName } from '../../lib/format';
import { useAuth } from '../auth/useAuth';
import { useHierarchy } from '../employees/queries';
import styles from './ApprovalsPage.module.css';
import { ACCOUNTS } from './keys';

/** where admins approve new accounts, and see the accounts of people in their team */
export function ApprovalsPage() {
  useDocumentTitle('Accounts · Hierarchy Hub');
  const { me } = useAuth();
  const accounts = useQuery({ queryKey: ACCOUNTS, queryFn: api.accounts });
  const hierarchy = useHierarchy();

  const { waiting, team, byId, choices } = useMemo(() => {
    const all = accounts.data ?? [];
    const people = hierarchy.data ?? [];
    const linked = new Set(all.map((a) => a.employeeId).filter(Boolean));
    // you can only link an account to someone below you who doesn't have one yet
    const below = me ? descendantsOf(me.employeeId, people) : [];
    return {
      waiting: all.filter((a) => a.status === 'pending'),
      team: all.filter((a) => a.status !== 'pending'),
      byId: new Map(people.map((p) => [p.id, p])),
      choices: below
        .filter((p) => !linked.has(p.id))
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    };
  }, [accounts.data, hierarchy.data, me]);

  if (accounts.isPending || hierarchy.isPending) {
    return <p className={styles.loading}>Loading accounts…</p>;
  }
  if (accounts.isError || hierarchy.isError) {
    return <p className={styles.loading}>We couldn’t load the accounts. Refresh to try again.</p>;
  }

  return (
    <div className={styles.page}>
      <Panel as="section" variant="solid" className={styles.panel} aria-labelledby="waiting-title">
        <h1 id="waiting-title" className={styles.title}>
          Waiting for approval
        </h1>
        <p className={styles.intro}>
          Check who each person is, then link their account to their employee record. You can only
          link people below you in the organisation.
        </p>
        {waiting.length === 0 ? (
          <p className={styles.empty}>Nobody is waiting. New sign ups will appear here.</p>
        ) : (
          <ul className={styles.list}>
            {waiting.map((account) => (
              <WaitingAccount key={account.id} account={account} choices={choices} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel as="section" variant="solid" className={styles.panel} aria-labelledby="team-title">
        <h2 id="team-title" className={styles.subtitle}>
          Your team’s accounts
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Employee</th>
                <th scope="col">Access</th>
                <th scope="col">Last signed in</th>
              </tr>
            </thead>
            <tbody>
              {team.map((account) => {
                const employee = account.employeeId ? byId.get(account.employeeId) : undefined;
                return (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.name}</strong>
                      <span className={styles.email}>{account.email}</span>
                    </td>
                    <td>
                      {employee ? `${fullName(employee)}, ${employee.role}` : 'No longer linked'}
                    </td>
                    <td>
                      {account.status === 'disabled'
                        ? 'Turned off'
                        : account.isAdmin
                          ? 'Admin'
                          : 'Member'}
                    </td>
                    <td>
                      {account.lastLoginAt ? formatDate(account.lastLoginAt.slice(0, 10)) : 'Never'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function WaitingAccount({ account, choices }: { account: AccountSummary; choices: Employee[] }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  // suggest the employee with the same email, it's usually them
  const [employeeId, setEmployeeId] = useState(
    () => choices.find((c) => c.email === account.email)?.id ?? '',
  );
  const [problem, setProblem] = useState<string | null>(null);
  const chosen = choices.find((c) => c.id === employeeId);
  const emailDiffers = chosen && chosen.email !== account.email;

  const done = () => queryClient.invalidateQueries({ queryKey: ACCOUNTS });
  const approve = useMutation({
    mutationFn: () => api.approveAccount(account.id, employeeId),
    onSuccess: async () => {
      showToast(`${account.name} can sign in now`);
      await done();
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError
          ? (error.fieldErrors.employeeId?.[0] ?? error.message)
          : 'Something went wrong. Try again.',
      ),
  });
  const reject = useMutation({
    mutationFn: () => api.rejectAccount(account.id),
    onSuccess: async () => {
      showToast(`Removed the request from ${account.name}`);
      await done();
    },
    onError: (error) =>
      setProblem(error instanceof ApiError ? error.message : 'Something went wrong. Try again.'),
  });
  const busy = approve.isPending || reject.isPending;
  const selectId = `link-${account.id}`;

  return (
    <li className={styles.item}>
      <div className={styles.who}>
        <strong>{account.name}</strong>
        <span className={styles.email}>{account.email}</span>
        <span className={styles.when}>Asked on {formatDate(account.createdAt.slice(0, 10))}</span>
      </div>
      <div className={styles.link}>
        <label htmlFor={selectId}>Link to employee</label>
        <select
          id={selectId}
          value={employeeId}
          onChange={(event) => {
            setEmployeeId(event.target.value);
            setProblem(null);
          }}
          aria-describedby={
            problem ? `${selectId}-problem` : emailDiffers ? `${selectId}-note` : undefined
          }
        >
          <option value="">Choose someone…</option>
          {choices.map((person) => (
            <option key={person.id} value={person.id}>
              {fullName(person)}, {person.role}
            </option>
          ))}
        </select>
        {problem ? (
          <p id={`${selectId}-problem`} className={styles.problem} role="alert">
            {problem}
          </p>
        ) : (
          emailDiffers && (
            <p id={`${selectId}-note`} className={styles.note}>
              Their email doesn’t match this employee’s ({chosen.email}). Make sure it’s really
              them.
            </p>
          )
        )}
      </div>
      <div className={styles.actions}>
        <Button variant="primary" disabled={!employeeId || busy} onClick={() => approve.mutate()}>
          Approve
        </Button>
        <Button variant="danger" disabled={busy} onClick={() => reject.mutate()}>
          Reject
        </Button>
      </div>
    </li>
  );
}
