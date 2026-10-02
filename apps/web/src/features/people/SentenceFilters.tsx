import type { Employee } from '@hierarchy-hub/shared';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { Waves } from '../../components/ui/Waves';
import { fullName } from '../../lib/format';
import { BIRTH_BANDS, hasActiveFilters, PAY_BANDS, type PeopleFilters } from './filters';
import styles from './SentenceFilters.module.css';

interface SentenceFiltersProps {
  filters: PeopleFilters;
  roles: string[];
  managers: Employee[];
  onChange: (changes: Partial<PeopleFilters>, options?: { replace?: boolean }) => void;
  onReset: () => void;
  onExport: () => void;
  exporting: boolean;
}

const SEARCH_DELAY_MS = 250;

interface PillSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  active: boolean;
  onChange: (value: string) => void;
}

/** one coloured word in the sentence. looks like a pill, behaves like a normal dropdown */
function PillSelect({ label, value, options, active, onChange }: PillSelectProps) {
  const shown = options.find((o) => o.value === value)?.label ?? value;
  return (
    <span className={active ? `${styles.pill} ${styles.on}` : styles.pill}>
      <span aria-hidden="true">{shown}</span>
      <svg
        className={styles.chevron}
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M1.5 3.5 5 7l3.5-3.5" />
      </svg>
      <select
        aria-label={label}
        className={styles.native}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/**
 * the filters read as one sentence you can edit, each coloured pill is a dropdown
 * plus a search box for names, emails and employee numbers
 */
export function SentenceFilters({
  filters,
  roles,
  managers,
  onChange,
  onReset,
  onExport,
  exporting,
}: SentenceFiltersProps) {
  // typing updates the box straight away but only hits the url (and the api) once you pause
  const [search, setSearch] = useState(filters.search);
  useEffect(() => setSearch(filters.search), [filters.search]);
  useEffect(() => {
    if (search === filters.search) return;
    const timer = setTimeout(() => onChange({ search }, { replace: true }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, filters.search, onChange]);

  return (
    <Panel spotlight className={styles.card} aria-label="Filters">
      <Waves className={styles.art} ball />
      <p className={styles.sentence}>
        Show people in{' '}
        <PillSelect
          label="Role"
          value={filters.role}
          active={filters.role !== 'any'}
          options={[
            { value: 'any', label: 'any role' },
            ...roles.map((role) => ({ value: role, label: role })),
          ]}
          onChange={(role) => onChange({ role })}
        />
        , earning{' '}
        <PillSelect
          label="Salary"
          value={filters.pay}
          active={filters.pay !== 'any'}
          options={PAY_BANDS.map(({ value, label }) => ({ value, label }))}
          onChange={(pay) => onChange({ pay: pay as PeopleFilters['pay'] })}
        />
        , born{' '}
        <PillSelect
          label="Birth date"
          value={filters.born}
          active={filters.born !== 'any'}
          options={BIRTH_BANDS.map(({ value, label }) => ({ value, label }))}
          onChange={(born) => onChange({ born: born as PeopleFilters['born'] })}
        />{' '}
        and reporting to{' '}
        <PillSelect
          label="Manager"
          value={filters.manager}
          active={filters.manager !== 'anyone'}
          options={[
            { value: 'anyone', label: 'anyone' },
            ...managers.map((manager) => ({ value: manager.id, label: fullName(manager) })),
          ]}
          onChange={(manager) => onChange({ manager })}
        />
        .
      </p>

      <div className={styles.bar}>
        <div className={styles.search}>
          <label htmlFor="people-search" className="sr-only">
            Search by name, email or employee number
          </label>
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <circle cx="7.5" cy="7.5" r="5.5" />
            <path d="M12 12l4.5 4.5" />
          </svg>
          <input
            id="people-search"
            type="search"
            placeholder="Search by name, email or employee number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.end}>
          {hasActiveFilters(filters) && <Button onClick={onReset}>Clear filters</Button>}
          <Button onClick={onExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
