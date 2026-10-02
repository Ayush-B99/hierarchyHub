import { useMemo } from 'react';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Panel } from '../components/ui/Panel';
import { useHierarchy } from '../features/employees/queries';
import { DetailsPanel } from '../features/explore/DetailsPanel';
import { Hero } from '../features/explore/Hero';
import { LevelsView } from '../features/explore/LevelsView';
import { OrbitView } from '../features/explore/OrbitView';
import { buildOrgIndex } from '../features/explore/orgIndex';
import { PathRail } from '../features/explore/PathRail';
import { useExploreParams } from '../features/explore/useExploreParams';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fullName } from '../lib/format';
import styles from './ExplorePage.module.css';

/** explore the org one person at a time, in orbit or levels view */
export function ExplorePage() {
  const { data, isPending, error, refetch } = useHierarchy();
  const { personId, view, selectPerson, setView } = useExploreParams();

  const org = useMemo(() => (data ? buildOrgIndex(data) : null), [data]);

  // whoever is in the url, or the top of the org if nobody is picked yet
  const fromUrl = personId ? org?.byId.get(personId) : undefined;
  const person = fromUrl ?? org?.roots[0];
  const missing = Boolean(personId && org && !fromUrl);

  useDocumentTitle(person ? `${fullName(person)} · Hierarchy Hub` : 'Explore · Hierarchy Hub');

  if (isPending) return <LoadingState label="Loading the organisation" />;
  if (error)
    return <ErrorState title="We couldn't load the organisation" error={error} onRetry={refetch} />;
  if (!org || !person) {
    return (
      <Panel className={styles.empty}>
        <h1 className="sr-only">Explore</h1>
        <p>No employees yet. Add the first person to get started.</p>
      </Panel>
    );
  }

  return (
    <>
      {missing && (
        <Panel className={styles.notice} role="status">
          We couldn't find that person. They may have been deleted, so here's the top of the
          organisation instead.
        </Panel>
      )}

      <Hero person={person} view={view} onViewChange={setView} />

      <div className={styles.layout}>
        {view === 'orbit' ? (
          <>
            <PathRail chain={org.chainOf(person.id)} onSelect={selectPerson} />
            <OrbitView
              person={person}
              org={org}
              onSelect={selectPerson}
              onShowAll={() => setView('levels')}
            />
          </>
        ) : (
          <LevelsView person={person} org={org} onSelect={selectPerson} />
        )}
        <DetailsPanel person={person} org={org} onSelect={selectPerson} />
      </div>
    </>
  );
}
