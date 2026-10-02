import type { Employee } from '@hierarchy-hub/shared';
import { Panel } from '../../components/ui/Panel';
import { Waves } from '../../components/ui/Waves';
import { fullName } from '../../lib/format';
import styles from './PathRail.module.css';

interface PathRailProps {
  chain: Employee[];
  onSelect: (id: string) => void;
}

/** everyone between the selected person and the top, click any stop to jump there */
export function PathRail({ chain, onSelect }: PathRailProps) {
  const last = chain.at(-1);
  return (
    <Panel as="aside" spotlight className={styles.rail} aria-labelledby="path-heading">
      <h2 id="path-heading">Path to the top</h2>
      <p className={styles.hint}>Everyone between this person and the top.</p>
      <ol className={styles.stations}>
        {chain.map((employee) => {
          const here = employee.id === last?.id;
          return (
            <li key={employee.id}>
              <button
                type="button"
                className={`${styles.station} ${here ? styles.here : ''}`}
                aria-current={here ? 'step' : undefined}
                onClick={() => onSelect(employee.id)}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span>
                  <span className={styles.name}>{fullName(employee)}</span>
                  <span className={styles.role}>{employee.role}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <Waves className={styles.art} ball />
    </Panel>
  );
}
