import { Button } from '../ui/Button';
import styles from './States.module.css';

interface ErrorStateProps {
  title: string;
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div className={styles.state} role="alert">
      <p className={styles.title}>{title}</p>
      <p className="muted">{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
