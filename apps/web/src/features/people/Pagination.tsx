import { Button } from '../../components/ui/Button';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  /** what's being counted, one and many, eg ['event', 'events'] */
  noun?: [string, string];
}

/** "showing 1 to 10 of 14 people" plus previous and next */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  noun = ['person', 'people'],
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className={styles.bar} aria-label="Pages">
      <p className={styles.summary} role="status">
        {total === 0
          ? 'No people match'
          : `Showing ${from} to ${to} of ${total} ${total === 1 ? noun[0] : noun[1]}`}
      </p>
      {pages > 1 && (
        <div className={styles.buttons}>
          <Button disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <span className={styles.page}>
            Page {page} of {pages}
          </span>
          <Button disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </nav>
  );
}
