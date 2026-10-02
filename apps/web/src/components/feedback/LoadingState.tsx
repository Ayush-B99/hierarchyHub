import styles from './States.module.css';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className={styles.state} role="status">
      <div className={styles.pearls} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="muted">{label}</p>
    </div>
  );
}
