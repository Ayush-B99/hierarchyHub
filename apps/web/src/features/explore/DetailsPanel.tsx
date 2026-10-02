import type { Employee } from '@hierarchy-hub/shared';
import { CountUp } from '../../components/motion/CountUp';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { Waves } from '../../components/ui/Waves';
import { formatDate, formatSalary, fullName, plural } from '../../lib/format';
import styles from './DetailsPanel.module.css';
import type { OrgIndex } from './orgIndex';

interface DetailsPanelProps {
  person: Employee;
  org: OrgIndex;
  onSelect: (id: string) => void;
}

/** everything about the selected person, plus quick links to the people they work with */
export function DetailsPanel({ person, org, onSelect }: DetailsPanelProps) {
  const manager = person.managerId ? org.byId.get(person.managerId) : undefined;
  const directReports = org.reportsOf(person.id).length;
  const levelsFromTop = org.chainOf(person.id).length - 1;
  const colleagues = manager ? org.reportsOf(manager.id).filter((e) => e.id !== person.id) : [];

  // tells people what happens to the team before they even open the delete dialog (BR-04)
  let deleteNote = `Nobody reports to ${person.firstName}, so nobody moves if they're deleted.`;
  if (directReports > 0) {
    deleteNote = manager
      ? `If deleted, ${plural(directReports, 'person', 'people')} will move to ${fullName(manager)}.`
      : `If deleted, ${plural(directReports, 'person becomes', 'people become')} top level.`;
  }

  return (
    <Panel as="aside" spotlight className={styles.panel} aria-labelledby="details-heading">
      <Waves className={styles.art} />
      <h2 id="details-heading">Details</h2>

      <ul className={styles.stats}>
        <li className={styles.stat}>
          <span className={styles.disc}>
            <CountUp value={directReports} />
          </span>
          <span className={styles.statLabel}>Direct reports</span>
        </li>
        <li className={styles.stat}>
          <span className={styles.disc}>
            <CountUp value={org.teamSizeOf(person.id)} />
          </span>
          <span className={styles.statLabel}>Whole team</span>
        </li>
        <li className={styles.stat}>
          <span className={styles.disc}>
            <CountUp value={levelsFromTop} />
          </span>
          <span className={styles.statLabel}>Levels from top</span>
        </li>
      </ul>

      <dl className={styles.facts}>
        <div>
          <dt>Employee no.</dt>
          <dd>{person.employeeNumber}</dd>
        </div>
        <div>
          <dt>Salary</dt>
          <dd className="num">{formatSalary(person.salary)}</dd>
        </div>
        <div>
          <dt>Birth date</dt>
          <dd>{formatDate(person.birthDate)}</dd>
        </div>
        <div>
          <dt>Reports to</dt>
          <dd>{manager ? fullName(manager) : 'Nobody (top level)'}</dd>
        </div>
        <div className={styles.wide}>
          <dt>Email</dt>
          <dd>{person.email}</dd>
        </div>
      </dl>

      <div>
        <h3>Works alongside</h3>
        <div className={styles.chips}>
          {colleagues.length === 0 ? (
            <span className="muted" style={{ fontSize: 13 }}>
              Nobody else at this level.
            </span>
          ) : (
            colleagues.map((colleague) => (
              <button
                key={colleague.id}
                type="button"
                className={styles.chip}
                onClick={() => onSelect(colleague.id)}
              >
                <Avatar
                  email={colleague.email}
                  firstName={colleague.firstName}
                  lastName={colleague.lastName}
                  size={34}
                />
                {fullName(colleague)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* these get wired up with the forms in part 3d, for now they just explain that */}
      <div className={styles.actions}>
        <Button variant="primary" disabled aria-describedby="actions-note">
          Edit details
        </Button>
        <Button disabled aria-describedby="actions-note">
          Change manager
        </Button>
        <Button variant="danger" disabled aria-describedby="actions-note">
          Delete
        </Button>
        <p id="actions-note" className={styles.note}>
          Editing, moving and deleting people is coming soon. {deleteNote}
        </p>
      </div>
    </Panel>
  );
}
