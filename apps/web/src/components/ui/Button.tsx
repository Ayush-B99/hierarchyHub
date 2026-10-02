import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger';
}

/** Soft pill button. Use `primary` for the main action on a screen. */
export function Button({ variant = 'default', className, type = 'button', ...rest }: ButtonProps) {
  const classes = [styles.button, variant !== 'default' && styles[variant], className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}
