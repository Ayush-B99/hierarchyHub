import { useMemo } from 'react';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Panel } from '../components/ui/Panel';
import { Waves } from '../components/ui/Waves';
import { PersonCard } from '../features/employees/PersonCard';
import { useHierarchy } from '../features/employees/queries';
import { fullName } from '../lib/format';
import styles from './ExplorePage.module.css';

/**
 * Starting point for the Explore page. Shows the top of the organisation and
 * their direct reports. The Orbit and Levels views replace the grid in part 3b.
 */
export function ExplorePage() {
  const { data, isPending, error, refetch } = useHierarchy();

  const view = useMemo(() => {
    if (!data) return null;
    const top = data.find((e) => e.managerId === null) ?? data[0];
    if (!top) return null;
    const teamSize = (id: string) => data.filter((e) => e.managerId === id).length;
    const reports = data.filter((e) => e.managerId === top.id);
    return { top, reports, teamSize };
  }, [data]);

  if (isPending) return <LoadingState label="Loading the organisation" />;
  if (error)
    return <ErrorState title="We couldn't load the organisation" error={error} onRetry={refetch} />;
  if (!view) {
    return (
      <Panel>
        <p style={{ padding: 32, margin: 0 }}>
          No employees yet. Add the first person to get started.
        </p>
      </Panel>
    );
  }

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-name">
        <Waves className={styles.waves} ball />
        <Panel as="div" className={styles.title}>
          <h1 id="hero-name">{fullName(view.top)}</h1>
          <p>{view.top.role}</p>
        </Panel>
      </section>

      <Panel spotlight className={styles.section} aria-labelledby="reports-heading">
        <h2 id="reports-heading">Reports to {view.top.firstName}</h2>
        <div className={styles.grid}>
          {view.reports.map((employee, index) => (
            <PersonCard
              key={employee.id}
              employee={employee}
              teamSize={view.teamSize(employee.id)}
              index={index}
            />
          ))}
        </div>
      </Panel>
    </>
  );
}
