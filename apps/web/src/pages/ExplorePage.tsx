import { orgAt, type Employee } from '@hierarchy-hub/shared';
import { useMemo } from 'react';
import { ErrorState } from '../components/feedback/ErrorState';
import { Panel } from '../components/ui/Panel';
import { useHierarchy } from '../features/employees/queries';
import { DetailsPanel } from '../features/explore/DetailsPanel';
import { ExploreSkeleton } from '../features/explore/ExploreSkeleton';
import { Hero } from '../features/explore/Hero';
import { LevelsView } from '../features/explore/LevelsView';
import { OrbitView } from '../features/explore/OrbitView';
import { buildOrgIndex } from '../features/explore/orgIndex';
import { PathRail } from '../features/explore/PathRail';
import { PastContext, useTimeTravel } from '../features/history/useTimeTravel';
import { TimeTravelBar } from '../features/history/TimeTravelBar';
import { useExploreParams } from '../features/explore/useExploreParams';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fullName } from '../lib/format';
import styles from './ExplorePage.module.css';

/** explore the org one person at a time, in orbit or levels view */
export function ExplorePage() {
  const { data, isPending, error, refetch } = useHierarchy();
  const { personId, view, selectPerson, setView } = useExploreParams();

  const travel = useTimeTravel();
  const people = useMemo<Employee[] | undefined>(() => {
    if (!data || !travel.at) return data;
    return orgAt(data, travel.changes, travel.at).map((p) => ({
      ...p,
      salary: null,
      birthDate: null,
      version: 0,
      createdAt: '',
      updatedAt: '',
    }));
  }, [data, travel.at, travel.changes]);

  const org = useMemo(() => (people ? buildOrgIndex(people) : null), [people]);
  const past = travel.at;

  // whoever is in the url, or the top of the org if nobody is picked yet
  const fromUrl = personId ? org?.byId.get(personId) : undefined;
  const person = fromUrl ?? org?.roots[0];
  const missing = Boolean(personId && org && !fromUrl && !past);

  useDocumentTitle(person ? `${fullName(person)} · Hierarchy Hub` : 'Explore · Hierarchy Hub');

  if (isPending) return <ExploreSkeleton />;
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
    <PastContext.Provider value={past}>
      <TimeTravelBar travel={travel} people={org.byId} />

      {past && (
        <Panel className={styles.notice} role="status">
          You&apos;re looking at the organisation as it was on{' '}
          {new Date(past).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          . Changes are switched off until you go back to today.
        </Panel>
      )}

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
    </PastContext.Provider>
  );
}
