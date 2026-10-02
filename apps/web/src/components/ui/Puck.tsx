import type { ButtonHTMLAttributes } from 'react';
import styles from './Puck.module.css';

interface PuckProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Every puck is icon-only, so it must have an accessible name. */
  'aria-label': string;
  size?: 'sm' | 'md' | 'lg';
  /** For toggle pucks. Pressed pucks look pushed in. */
  pressed?: boolean;
}

/** Round, raised icon button, like the white discs in the design reference. */
export function Puck({ size = 'md', pressed, className, type = 'button', ...rest }: PuckProps) {
  const classes = [styles.puck, size !== 'md' && styles[size], className].filter(Boolean).join(' ');
  return <button type={type} className={classes} aria-pressed={pressed} {...rest} />;
}
