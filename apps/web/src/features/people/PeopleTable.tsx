import type { Employee, EmployeeSortField } from '@hierarchy-hub/shared';
import { Link, useNavigate } from 'react-router';
import { Avatar } from '../../components/ui/Avatar';
import { formatDate, formatSalary, fullName, plural } from '../../lib/format';
import type { OrgIndex } from '../explore/orgIndex';
import styles from './PeopleTable.module.css';

interface Column {
  label: string;
  /** null means the column can't be sorted (it's worked out, not stored) */
  sort: EmployeeSortField | null;
  right?: boolean;
}

const COLUMNS: Column[] = [
  { label: 'Name', sort: 'lastName' },
  { label: 'Employee no.', sort: 'employeeNumber' },
  { label: 'Role', sort: 'role' },
  { label: 'Reports to', sort: 'managerName' },
  { label: 'Team below', sort: null },
  { label: 'Birth date', sort: 'birthDate' },
  { label: 'Salary', sort: 'salary', right: true },
];

interface PeopleTableProps {
  rows: Employee[];
  org: OrgIndex;
  sort: EmployeeSortField;
  dir: 'asc' | 'desc';
  onSort: (field: EmployeeSortField) => void;
  busy: boolean;
}

/** the employee table, click any heading to sort and any row to open that person */
export function PeopleTable({ rows, org, sort, dir, onSort, busy }: PeopleTableProps) {
  const navigate = useNavigate();
  // so the team bars are relative to the biggest team in the whole org
  const biggestTeam = Math.max(1, ...org.roots.map((r) => org.teamSizeOf(r.id)));

  return (
    <div className={`${styles.box} ${busy ? styles.busy : ''}`} aria-busy={busy}>
      <table className={styles.table}>
        <caption className="sr-only">Employees. Click a column heading to sort.</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = column.sort === sort;
              return (
                <th
                  key={column.label}
                  scope="col"
                  className={column.right ? styles.right : undefined}
                  aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {column.sort ? (
                    <button
                      type="button"
                      className={styles.sort}
                      onClick={() => column.sort && onSort(column.sort)}
                    >
                      {column.label}
                      <span className={styles.arrow} aria-hidden="true">
                        {active ? (dir === 'asc' ? '↑' : '↓') : ''}
                      </span>
                    </button>
                  ) : (
                    <span className={styles.plain}>{column.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => {
            const manager = e.managerId ? org.byId.get(e.managerId) : undefined;
            const depth = org.chainOf(e.id).length - 1;
            const team = org.teamSizeOf(e.id);
            const depthLabel =
              depth === 0 ? 'Top level' : `${plural(depth, 'level', 'levels')} below the top`;
            const explore = `/?person=${e.id}`;
            return (
              // the whole row is clickable for mouse users, the name link does the same for keyboards
              <tr
                key={e.id}
                onClick={(event) => {
                  if (!(event.target as HTMLElement).closest('a')) navigate(explore);
                }}
              >
                <td>
                  <Link to={explore} className={styles.who}>
                    <Avatar
                      email={e.email}
                      firstName={e.firstName}
                      lastName={e.lastName}
                      size={38}
                    />
                    <span>
                      <strong>{fullName(e)}</strong>
                      <span className={styles.email}>{e.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="muted">{e.employeeNumber}</td>
                <td>{e.role}</td>
                <td>
                  <span className={styles.trail} title={depthLabel}>
                    {Array.from({ length: depth + 1 }, (_, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {i > 0 && <span className={styles.seg} />}
                        <span className={`${styles.pt} ${i === depth ? styles.end : ''}`} />
                      </span>
                    ))}
                  </span>
                  <span className="sr-only">{depthLabel}. </span>
                  {manager ? fullName(manager) : 'Top level'}
                </td>
                <td>
                  <span className={styles.meter} aria-hidden="true">
                    <span style={{ width: `${Math.round((team / biggestTeam) * 100)}%` }} />
                  </span>
                  <span className="num">
                    {team === 0 ? 'None' : plural(team, 'person', 'people')}
                  </span>
                </td>
                <td className="muted">{formatDate(e.birthDate)}</td>
                <td className={`${styles.rightCell} num`}>{formatSalary(e.salary)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
