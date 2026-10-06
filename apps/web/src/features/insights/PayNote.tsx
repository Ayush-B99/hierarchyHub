import type { PayFlag } from '@hierarchy-hub/shared';
import { formatSalary } from '../../lib/format';
import styles from './PayNote.module.css';

export function PayNote({ flag, trainedOn }: { flag: PayFlag; trainedOn: number }) {
  const percent = Math.round(Math.abs(flag.difference) * 100);
  const direction = flag.difference > 0 ? 'more' : 'less';

  return (
    <aside className={styles.note} aria-label="Pay check">
      <p className={styles.title}>Pay check</p>
      <p>
        Earns {percent}% {direction} than people in a similar position here usually do (about{' '}
        {formatSalary(Math.round(flag.expected / 1000) * 1000)}).
      </p>
      <p className={styles.how}>
        Worth a look, not a verdict. Learned from the {trainedOn} salaries you can see, using team
        size only, so it can&apos;t know about seniority or skills.
      </p>
    </aside>
  );
}

export function PayTag({ flag }: { flag: PayFlag }) {
  const percent = Math.round(flag.difference * 100);
  return (
    <span
      className={styles.tag}
      title={`About ${Math.abs(percent)}% ${percent > 0 ? 'above' : 'below'} what a similar position usually earns here`}
    >
      {percent > 0 ? '+' : '−'}
      {Math.abs(percent)}%
    </span>
  );
}
