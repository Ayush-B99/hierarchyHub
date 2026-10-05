import { AUDIT_ACTIONS, type AuditAction, type AuditEvent } from '@hierarchy-hub/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Panel } from '../../components/ui/Panel';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { api } from '../../lib/api';
import { fullName } from '../../lib/format';
import { useHierarchy } from '../employees/queries';
import { Pagination } from '../people/Pagination';
import styles from './AuditPage.module.css';
import { ACTION_LABELS, describe, describeChanges } from './describe';

const PAGE_SIZE = 25;

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * who did what, when (adr 0018). admins see their own part of the organisation. the filters
 * live in the address, so a person's history can be linked to and shared
 */
export function AuditPage() {
  useDocumentTitle('Audit · Hierarchy Hub');
  const [params, setParams] = useSearchParams();
  const person = params.get('person') ?? undefined;
  const action = (params.get('action') ?? undefined) as AuditAction | undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);

  const hierarchy = useHierarchy();
  const events = useQuery({
    queryKey: ['audit', { person, action, page }],
    queryFn: () => api.audit({ employeeId: person, action, page, pageSize: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const people = useMemo(
    () => [...(hierarchy.data ?? [])].sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [hierarchy.data],
  );

  const set = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <div className={styles.page}>
      <Panel as="section" variant="solid" className={styles.panel} aria-labelledby="audit-title">
        <h1 id="audit-title" className={styles.title}>
          Audit
        </h1>
        <p className={styles.intro}>
          Everything that changed in your part of the organisation: who did it, when, and what it
          was before and after. Nothing here can be changed or deleted.
        </p>

        <div className={styles.filters}>
          <label>
            <span>Person</span>
            <select
              value={person ?? ''}
              onChange={(e) => set('person', e.target.value || undefined)}
            >
              <option value="">Everyone</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {fullName(p)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>What happened</span>
            <select
              value={action ?? ''}
              onChange={(e) => set('action', e.target.value || undefined)}
            >
              <option value="">Anything</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {events.isPending ? (
          <p className={styles.empty}>Loading the history…</p>
        ) : events.isError ? (
          <p className={styles.empty}>We couldn’t load the history. Refresh to try again.</p>
        ) : events.data.total === 0 ? (
          <p className={styles.empty}>Nothing has happened here yet.</p>
        ) : (
          <>
            <ol className={styles.list} aria-label="Events, newest first">
              {events.data.items.map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
            </ol>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={events.data.total}
              onPage={(p) => set('page', String(p))}
              noun={['event', 'events']}
            />
          </>
        )}
      </Panel>
    </div>
  );
}

function EventItem({ event }: { event: AuditEvent }) {
  const changes = describeChanges(event);
  return (
    <li className={styles.item}>
      <div className={styles.what}>
        <p className={styles.sentence}>{describe(event)}</p>
        {changes.length > 0 && (
          <ul className={styles.changes}>
            {changes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.meta}>
        <time dateTime={event.at}>{when(event.at)}</time>
        {event.subject?.employeeId && (
          <Link to={`/audit?person=${event.subject.employeeId}`} className={styles.personLink}>
            Their history
          </Link>
        )}
      </div>
    </li>
  );
}
