import type { Employee } from '@hierarchy-hub/shared';
import type { CSSProperties } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { fullName, plural } from '../../lib/format';
import styles from './PersonNode.module.css';

interface PersonNodeProps {
  employee: Employee;
  teamSize: number;
  onSelect: (id: string) => void;
  /** small line above the picture, eg "Reports to" */
  label?: string;
  style?: CSSProperties;
}

/** one clickable person card in the orbit */
export function PersonNode({ employee, teamSize, onSelect, label, style }: PersonNodeProps) {
  return (
    <button
      type="button"
      className={styles.node}
      style={style}
      onClick={() => onSelect(employee.id)}
    >
      {label && <span className={styles.label}>{label}</span>}
      <Avatar
        email={employee.email}
        firstName={employee.firstName}
        lastName={employee.lastName}
        size={48}
      />
      <span className={styles.name}>{fullName(employee)}</span>
      <span className={styles.role}>{employee.role}</span>
      <span className={[styles.tag, teamSize > 0 && styles.tagOn].filter(Boolean).join(' ')}>
        {teamSize > 0 ? plural(teamSize, 'report', 'reports') : 'No team'}
      </span>
    </button>
  );
}

/** stands in for the people that don't fit in the orbit */
export function MoreNode({
  count,
  onClick,
  style,
}: {
  count: number;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      className={`${styles.node} ${styles.more}`}
      style={style}
      onClick={onClick}
    >
      +{count} more
      <span className={styles.role}>See everyone in Levels</span>
    </button>
  );
}
