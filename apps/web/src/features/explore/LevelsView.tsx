import type { Employee } from '@hierarchy-hub/shared';
import { Avatar } from '../../components/ui/Avatar';
import { Panel } from '../../components/ui/Panel';
import { fullName } from '../../lib/format';
import styles from './LevelsView.module.css';
import type { OrgIndex } from './orgIndex';

interface LevelsViewProps {
  person: Employee;
  org: OrgIndex;
  onSelect: (id: string) => void;
}

const CHEVRON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    aria-hidden="true"
  >
    <path d="M5 3l4 4-4 4" />
  </svg>
);

/**
 * one column per level, like finder on a mac
 * the columns follow the path from the top down to whoever is selected
 */
export function LevelsView({ person, org, onSelect }: LevelsViewProps) {
  const chain = org.chainOf(person.id);
  // first column is the top of the org, then the team of each person on the path
  const columns: { owner: Employee | null; people: Employee[] }[] = [
    { owner: null, people: org.roots },
    ...chain.map((owner) => ({ owner, people: org.reportsOf(owner.id) })),
  ];
  const onPath = new Set(chain.map((e) => e.id));

  return (
    <Panel variant="solid" className={styles.box} aria-label="Levels view">
      <div className={styles.cols}>
        {columns.map(({ owner, people }, level) => (
          <div className={styles.col} key={owner?.id ?? 'top'}>
            <h2>{owner ? `Reports to ${owner.firstName}` : 'Top level'}</h2>
            {people.length === 0 ? (
              <p className={styles.empty}>Nobody reports to {owner?.firstName} yet.</p>
            ) : (
              <ul className={styles.list}>
                {people.map((employee) => {
                  const isSelected = employee.id === person.id;
                  const isTrail = !isSelected && onPath.has(employee.id) && level < chain.length;
                  const count = org.reportsOf(employee.id).length;
                  const className = [
                    styles.row,
                    isSelected && styles.active,
                    isTrail && styles.trail,
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <li key={employee.id}>
                      <button
                        type="button"
                        className={className}
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => onSelect(employee.id)}
                      >
                        <Avatar
                          email={employee.email}
                          firstName={employee.firstName}
                          lastName={employee.lastName}
                          size={36}
                        />
                        <span className={styles.text}>
                          <span className={styles.name}>{fullName(employee)}</span>
                          <span className={styles.role}>{employee.role}</span>
                        </span>
                        {count > 0 && (
                          <span className={styles.count}>
                            <span className="sr-only">has </span>
                            {count}
                            <span className="sr-only"> direct reports</span>
                            {CHEVRON}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className={styles.foot}>Each column is one level down. Pick someone to open their team.</p>
    </Panel>
  );
}
