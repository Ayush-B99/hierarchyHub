import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Avatar } from '../components/ui/Avatar';
import { Panel } from '../components/ui/Panel';
import { useEmployees } from '../features/employees/queries';
import { formatSalary, fullName, plural } from '../lib/format';
import styles from './PeoplePage.module.css';

/**
 * Starting point for the People page. A plain table for now; the sentence
 * filters and sortable columns arrive in part 3c.
 */
export function PeoplePage() {
  const { data, isPending, error, refetch } = useEmployees({ pageSize: 100, sortBy: 'lastName' });

  return (
    <>
      <div className={styles.header}>
        <h1>People</h1>
        {data && <span className="muted">{plural(data.total, 'person', 'people')}</span>}
      </div>
      <Panel variant="solid" className={styles.tableBox}>
        {isPending && <LoadingState label="Loading people" />}
        {error && <ErrorState title="We couldn't load people" error={error} onRetry={refetch} />}
        {data && (
          <table className={styles.table}>
            <caption className="sr-only">All employees</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Employee no.</th>
                <th scope="col">Role</th>
                <th scope="col" className={styles.right}>
                  Salary
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className={styles.who}>
                      <Avatar
                        email={e.email}
                        firstName={e.firstName}
                        lastName={e.lastName}
                        size={36}
                      />
                      {fullName(e)}
                    </span>
                  </td>
                  <td className="muted">{e.employeeNumber}</td>
                  <td>{e.role}</td>
                  <td className={`${styles.right} num`}>{formatSalary(e.salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
