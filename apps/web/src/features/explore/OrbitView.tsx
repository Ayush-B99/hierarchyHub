import type { Employee } from '@hierarchy-hub/shared';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { fullName } from '../../lib/format';
import type { OrgIndex } from './orgIndex';
import styles from './OrbitView.module.css';
import { MoreNode, PersonNode } from './PersonNode';

interface OrbitViewProps {
  person: Employee;
  org: OrgIndex;
  onSelect: (id: string) => void;
  onShowAll: () => void;
}

// stage geometry, everything is placed around the centre card
const CX = 390;
const CY = 250;
const RADIUS = 260;
const NODE_WIDTH = 140;
const STAGE_WIDTH = 780;
const STAGE_HEIGHT = 680;
// more than this and the arc gets crowded, so the rest go behind a "+n more" card
const MAX_SHOWN = 7;
// below this width the arc gets too small to read, so we stack everything instead
const STACK_BELOW = 620;

function linkStyle(x1: number, y1: number, x2: number, y2: number) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return { left: x1, top: y1, width: length, transform: `rotate(${angle}deg)` };
}

/** spreads n cards along an arc under the centre card */
function arcPositions(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const degrees = count === 1 ? 90 : 18 + (144 * i) / (count - 1);
    const radians = (degrees * Math.PI) / 180;
    return {
      x: Math.round(CX + RADIUS * Math.cos(radians)),
      y: Math.round(CY + 70 + RADIUS * 0.72 * Math.sin(radians)),
    };
  });
}

/** watches how wide the orbit area is so it can shrink to fit or switch to the stacked layout */
function useBoxWidth() {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/**
 * the orbit: selected person in the middle, their manager above and their team below
 * click anyone to move to them. on narrow screens it stacks instead so nothing gets tiny
 */
export function OrbitView({ person, org, onSelect, onShowAll }: OrbitViewProps) {
  const manager = person.managerId ? org.byId.get(person.managerId) : undefined;
  const reports = org.reportsOf(person.id);
  const overflow = reports.length > MAX_SHOWN;
  const shown = overflow ? reports.slice(0, MAX_SHOWN - 1) : reports;

  const { ref: boxRef, width } = useBoxWidth();
  const stacked = width > 0 && width < STACK_BELOW;
  const scale = width > 0 ? Math.min(1, width / STAGE_WIDTH) : 1;

  // when you click a card it disappears (it becomes the centre), so we move keyboard
  // focus to the new centre card instead of dropping it back to the top of the page
  const centreRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  useEffect(() => {
    if (moveFocus.current) {
      centreRef.current?.focus({ preventScroll: true });
      moveFocus.current = false;
    }
  }, [person.id]);

  const select = (id: string) => {
    moveFocus.current = true;
    onSelect(id);
  };

  const centre = (
    <div
      ref={centreRef}
      tabIndex={-1}
      className={stacked ? `${styles.focus} ${styles.focusStacked}` : styles.focus}
      aria-label={`${fullName(person)}, ${person.role}`}
    >
      <span className={styles.ring}>
        <Avatar
          email={person.email}
          firstName={person.firstName}
          lastName={person.lastName}
          size={96}
        />
      </span>
      <span className={styles.focusName}>{fullName(person)}</span>
      <span className="muted" style={{ fontSize: 13 }}>
        {person.role}
      </span>
    </div>
  );

  const label = `Orbit around ${fullName(person)}`;

  if (stacked) {
    return (
      <section ref={boxRef} className={styles.box} aria-label={label}>
        <div className={styles.stack} key={person.id}>
          {manager && (
            <>
              <PersonNode
                employee={manager}
                teamSize={org.reportsOf(manager.id).length}
                onSelect={select}
                label="Reports to"
              />
              <span className={styles.stem} aria-hidden="true" />
            </>
          )}
          {centre}
          {reports.length > 0 ? (
            <>
              <span className={styles.stem} aria-hidden="true" />
              <div className={styles.grid}>
                {shown.map((report, i) => (
                  <PersonNode
                    key={report.id}
                    employee={report}
                    teamSize={org.reportsOf(report.id).length}
                    onSelect={select}
                    style={{ animationDelay: `${60 + i * 50}ms` }}
                  />
                ))}
                {overflow && <MoreNode count={reports.length - shown.length} onClick={onShowAll} />}
              </div>
            </>
          ) : (
            <p className={styles.emptyStacked}>Nobody reports to {person.firstName} yet.</p>
          )}
        </div>
      </section>
    );
  }

  const slots = arcPositions(shown.length + (overflow ? 1 : 0));
  const moreSlot = overflow ? slots.at(-1) : undefined;

  return (
    <section ref={boxRef} className={styles.box} aria-label={label}>
      <div
        className={styles.fit}
        style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }}
      >
        {/* key on the person so everything animates in again when you move */}
        <div className={styles.stage} key={person.id} style={{ transform: `scale(${scale})` }}>
          {manager && <div className={styles.link} style={linkStyle(CX, 110, CX, CY)} />}
          {slots.map((slot, i) => (
            <div key={i} className={styles.link} style={linkStyle(CX, CY, slot.x, slot.y + 30)} />
          ))}

          {manager && (
            <PersonNode
              employee={manager}
              teamSize={org.reportsOf(manager.id).length}
              onSelect={select}
              label="Reports to"
              style={{ position: 'absolute', left: CX - NODE_WIDTH / 2, top: 4 }}
            />
          )}

          {centre}

          {shown.map((report, i) => {
            const slot = slots[i];
            if (!slot) return null;
            return (
              <PersonNode
                key={report.id}
                employee={report}
                teamSize={org.reportsOf(report.id).length}
                onSelect={select}
                style={{
                  position: 'absolute',
                  left: slot.x - NODE_WIDTH / 2,
                  top: slot.y,
                  animationDelay: `${60 + i * 50}ms`,
                }}
              />
            );
          })}

          {moreSlot && (
            <MoreNode
              count={reports.length - shown.length}
              onClick={onShowAll}
              style={{ position: 'absolute', left: moreSlot.x - NODE_WIDTH / 2, top: moreSlot.y }}
            />
          )}

          {reports.length === 0 && (
            <p className={styles.empty}>Nobody reports to {person.firstName} yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
