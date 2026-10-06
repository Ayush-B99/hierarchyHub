import type { OrgChange, OrgPerson } from '@hierarchy-hub/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { describeChange } from './describeChange';
import styles from './TimeTravelBar.module.css';
import type { TimeTravel } from './useTimeTravel';

const STEP_MS = 1200;

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const justBefore = (iso: string) => new Date(new Date(iso).getTime() - 1).toISOString();

export function TimeTravelBar({
  travel,
  people,
}: {
  travel: TimeTravel;
  people: Map<string, OrgPerson>;
}) {
  const { at, setAt, times, changes } = travel;
  const [playing, setPlaying] = useState(false);
  const last = times.length;

  const position = useMemo(() => {
    if (!at) return last;
    const index = times.findIndex((t) => t > at);
    return index === -1 ? last : index;
  }, [at, times, last]);

  const goTo = useCallback(
    (index: number) => {
      if (index >= last) setAt(null);
      else if (index === 0) setAt(justBefore(times[0]!));
      else setAt(times[index - 1]!);
    },
    [last, setAt, times],
  );

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (position >= last) setPlaying(false);
      else goTo(position + 1);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, position, last, goTo]);

  if (times.length === 0) return null;

  const happened: OrgChange[] =
    position > 0 ? changes.filter((c) => c.at === times[position - 1]) : [];
  const label =
    position === last
      ? 'Today'
      : position === 0
        ? `Before ${dateOf(times[0]!)}`
        : dateOf(times[position - 1]!);

  return (
    <Panel as="section" className={styles.bar} aria-label="Time travel">
      <div className={styles.controls}>
        <Button
          onClick={() => {
            if (playing) setPlaying(false);
            else {
              if (position >= last) goTo(0);
              setPlaying(true);
            }
          }}
        >
          {playing ? 'Pause' : 'Play history'}
        </Button>
        <label className={styles.slider}>
          <span className="sr-only">Moment in time</span>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={position}
            aria-valuetext={label}
            onChange={(e) => {
              setPlaying(false);
              goTo(Number(e.target.value));
            }}
          />
        </label>
        <span className={styles.when} aria-live="polite">
          {label}
        </span>
        {at && (
          <Button
            variant="primary"
            onClick={() => {
              setPlaying(false);
              setAt(null);
            }}
          >
            Back to today
          </Button>
        )}
      </div>
      {happened.length > 0 && (
        <p className={styles.what}>{happened.map((c) => describeChange(c, people)).join(' · ')}</p>
      )}
    </Panel>
  );
}
