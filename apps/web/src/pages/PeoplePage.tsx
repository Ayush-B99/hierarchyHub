import { descendantsOf, type Employee, type EmployeeSortField } from '@hierarchy-hub/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { useEmployees, useHierarchy } from '../features/employees/queries';
import { buildOrgIndex } from '../features/explore/orgIndex';
import { downloadCsv, toCsv } from '../features/people/csv';
import { PAGE_SIZE, toApiQuery } from '../features/people/filters';
import { Pagination } from '../features/people/Pagination';
import { PeopleSkeleton } from '../features/people/PeopleSkeleton';
import { PeopleTable } from '../features/people/PeopleTable';
import { SentenceFilters } from '../features/people/SentenceFilters';
import { usePeopleParams } from '../features/people/usePeopleParams';
import { useAuth } from '../features/auth/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api } from '../lib/api';
import styles from './PeoplePage.module.css';

/** the reporting table: filter with the sentence, sort by any column, page through, export */
export function PeoplePage() {
  useDocumentTitle('People · Hierarchy Hub');
  const { me } = useAuth();
  const { filters, update, reset } = usePeopleParams();
  const apiQuery = useMemo(() => toApiQuery(filters), [filters]);

  // the full list feeds the dropdowns and the "reports to" / "team below" columns
  const hierarchy = useHierarchy();
  const org = useMemo(
    () => (hierarchy.data ? buildOrgIndex(hierarchy.data) : null),
    [hierarchy.data],
  );
  const roles = useMemo(
    () => [...new Set(hierarchy.data?.map((e) => e.role) ?? [])].sort((a, b) => a.localeCompare(b)),
    [hierarchy.data],
  );
  const managers = useMemo(() => {
    if (!org || !hierarchy.data) return [];
    return hierarchy.data
      .filter((e) => org.reportsOf(e.id).length > 0)
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [hierarchy.data, org]);

  const list = useEmployees({ ...apiQuery, page: filters.page, pageSize: PAGE_SIZE });

  // if a filter leaves you on a page that no longer exists, hop back to the last real page
  const total = list.data?.total;
  useEffect(() => {
    if (total === undefined) return;
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (filters.page > lastPage) update({ page: lastPage }, { replace: true });
  }, [total, filters.page, update]);

  const onSort = useCallback(
    (field: EmployeeSortField) =>
      update({
        sort: field,
        dir: field === filters.sort && filters.dir === 'asc' ? 'desc' : 'asc',
      }),
    [filters.sort, filters.dir, update],
  );

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const onExport = useCallback(async () => {
    if (!org) return;
    setExporting(true);
    setExportError(null);
    try {
      // grab every matching person, not just this page
      const everyone: Employee[] = [];
      for (let page = 1; ; page += 1) {
        const batch = await api.listEmployees({ ...apiQuery, page, pageSize: 500 });
        everyone.push(...batch.items);
        if (everyone.length >= batch.total || batch.items.length === 0) break;
      }
      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(`hierarchy-hub-people-${today}.csv`, toCsv(everyone, org.byId));
    } catch {
      setExportError("The export didn't work. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [apiQuery, org]);

  // salaries and birth dates you can't see aren't used to filter or sort (adr 0017), so say
  // so whenever that leaves people out
  const usesPrivate =
    apiQuery.salaryMin !== undefined ||
    apiQuery.salaryMax !== undefined ||
    apiQuery.bornAfter !== undefined ||
    apiQuery.bornBefore !== undefined ||
    apiQuery.sortBy === 'salary' ||
    apiQuery.sortBy === 'birthDate';
  const seesEveryone =
    !!me &&
    !!hierarchy.data &&
    descendantsOf(me.employeeId, hierarchy.data).length + 1 >= hierarchy.data.length;

  if (hierarchy.isPending) return <PeopleSkeleton />;
  if (hierarchy.error || !org) {
    return (
      <ErrorState
        title="We couldn't load people"
        error={hierarchy.error}
        onRetry={hierarchy.refetch}
      />
    );
  }

  return (
    <>
      <h1 className="sr-only">People</h1>
      <SentenceFilters
        filters={filters}
        roles={roles}
        managers={managers}
        onChange={update}
        onReset={reset}
        onExport={onExport}
        exporting={exporting}
      />

      {exportError && (
        <Panel className={styles.exportError} role="alert">
          {exportError}
        </Panel>
      )}

      {usesPrivate && !seesEveryone && (
        <p className={styles.privateNote} role="note">
          Salary and birth date filters and sorting only include you and the people below you,
          because those are the only salaries and birth dates you can see.
        </p>
      )}

      <Panel variant="solid" aria-label="Employees">
        {list.error ? (
          <ErrorState
            title="We couldn't load this list"
            error={list.error}
            onRetry={list.refetch}
          />
        ) : !list.data ? (
          <LoadingState label="Loading people" />
        ) : list.data.total === 0 ? (
          <div className={styles.empty}>
            <p>Nobody matches that. Try changing one of the highlighted words.</p>
            <Button onClick={reset}>Clear filters</Button>
          </div>
        ) : (
          <>
            <PeopleTable
              rows={list.data.items}
              org={org}
              sort={filters.sort}
              dir={filters.dir}
              onSort={onSort}
              busy={list.isPlaceholderData}
            />
            <Pagination
              page={filters.page}
              pageSize={PAGE_SIZE}
              total={list.data.total}
              onPage={(page) => update({ page })}
            />
          </>
        )}
      </Panel>
    </>
  );
}
