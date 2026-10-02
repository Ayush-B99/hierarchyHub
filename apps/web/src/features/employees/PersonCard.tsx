import type { Employee } from '@hierarchy-hub/shared';
import { Avatar } from '../../components/ui/Avatar';
import { fullName, plural } from '../../lib/format';
import styles from './PersonCard.module.css';

interface PersonCardProps {
  employee: Employee;
  teamSize: number;
  /** Stagger for the entrance animation. */
  index?: number;
}

/** Raised clay card for one person, with their picture, role and team size. */
export function PersonCard({ employee, teamSize, index = 0 }: PersonCardProps) {
  return (
    <article className={styles.card} style={{ animationDelay: `${index * 50}ms` }}>
      <Avatar
        email={employee.email}
        firstName={employee.firstName}
        lastName={employee.lastName}
        size={56}
      />
      <h3 className={styles.name}>{fullName(employee)}</h3>
      <span className={styles.role}>{employee.role}</span>
      <span className={[styles.tag, teamSize > 0 && styles.tagOn].filter(Boolean).join(' ')}>
        {teamSize > 0 ? plural(teamSize, 'report', 'reports') : 'No team'}
      </span>
    </article>
  );
}
