import type { Employee } from '@hierarchy-hub/shared';
import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { useSpotlight } from '../../hooks/useSpotlight';
import { fullName, plural } from '../../lib/format';
import styles from './PersonNode.module.css';

/** how a card should look while someone is dragging */
export type DropLook = 'dragging' | 'target' | 'over' | 'blocked' | undefined;

interface PersonNodeProps {
  employee: Employee;
  teamSize: number;
  onSelect: (id: string) => void;
  /** small line above the picture, eg "Reports to" */
  label?: string;
  style?: CSSProperties;
  dropLook?: DropLook;
  dragHandles?: {
    onPointerDown: (event: PointerEvent) => void;
    onClickCapture: (event: MouseEvent) => void;
  };
}

/** one clickable person card in the orbit */
export function PersonNode({
  employee,
  teamSize,
  onSelect,
  label,
  style,
  dropLook,
  dragHandles,
}: PersonNodeProps) {
  const spotlight = useSpotlight();
  return (
    <button
      type="button"
      className={[styles.node, dropLook && styles[dropLook]].filter(Boolean).join(' ')}
      style={style}
      data-drop-id={employee.id}
      onClick={() => onSelect(employee.id)}
      onPointerMove={spotlight}
      {...dragHandles}
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

/** the little card that follows the pointer while you drag someone */
export function DragGhost({
  employee,
  x,
  y,
  over,
}: {
  employee: Employee;
  x: number;
  y: number;
  over: boolean;
}) {
  return (
    <div className={styles.ghost} style={{ left: x + 14, top: y + 14 }} aria-hidden="true">
      <Avatar
        email={employee.email}
        firstName={employee.firstName}
        lastName={employee.lastName}
        size={30}
      />
      <span>{over ? `Move ${employee.firstName} here` : fullName(employee)}</span>
    </div>
  );
}
