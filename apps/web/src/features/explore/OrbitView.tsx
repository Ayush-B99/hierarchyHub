import type { Employee } from '@hierarchy-hub/shared';
import { descendantsOf } from '@hierarchy-hub/shared';
import { useEffect, useMemo, useRef, useState, type FocusEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '../../components/ui/Avatar';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { fullName } from '../../lib/format';
import type { OrgIndex } from './orgIndex';
import styles from './OrbitView.module.css';
import { MoveEmployeeDialog } from './MoveEmployeeDialog';
import { DragGhost, MoreNode, PersonNode, type DropLook } from './PersonNode';
import { useOrbitDrag } from './useOrbitDrag';
import { CENTRE_Z, RING } from './orbitRing';
import { useOrbitSpin } from './useOrbitSpin';

interface OrbitViewProps {
  person: Employee;
  org: OrgIndex;
  onSelect: (id: string) => void;
  onShowAll: () => void;
}

// stage geometry. the ring itself is described in orbitRing.ts
const CX = RING.cx;
const STAGE_WIDTH = 780;
const STAGE_HEIGHT = 660;
// the middle of the centre card
const SUN_Y = 380;
// the centre card's size, so it sits exactly in the middle of the ring
const CENTRE_WIDTH = 260;
const CENTRE_HALF_HEIGHT = 118;
// where the manager card ends and the centre card starts, for the line between them
const MANAGER_BOTTOM = 182;
// more than this and the ring gets crowded, so the rest go behind a "+n more" card
const MAX_SHOWN = 7;
// below this width the ring gets too small to read, so we stack everything instead
const STACK_BELOW = 620;

/** is this element showing a keyboard focus ring (not focus from a click) */
function hasKeyboardFocus(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return false;
  }
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

  // drag and drop: you can't drop someone on themselves, on anyone below them
  // (that would be a loop) or on the manager they already have
  const [pending, setPending] = useState<{ id: string; to: string } | null>(null);
  const everyone = useMemo(() => [...org.byId.values()], [org]);
  const canDrop = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return false;
    if (org.byId.get(draggedId)?.managerId === targetId) return false;
    return !descendantsOf(draggedId, everyone).some((e) => e.id === targetId);
  };
  const { drag, handlesFor } = useOrbitDrag({
    canDrop,
    onDrop: (id, to) => setPending({ id, to }),
  });

  // the ring stops turning while you point at a card, tab through them, drag someone or confirm a move
  const [hovering, setHovering] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const reduced = usePrefersReducedMotion();
  const ringCount = shown.length + (overflow ? 1 : 0);
  const { itemRef, spinHandlers, spinning, bringToFront } = useOrbitSpin({
    count: ringCount,
    resetKey: person.id,
    paused: hovering || keyboardFocus || Boolean(drag) || Boolean(pending),
    reduced,
    scale,
  });

  // a new centre person means the old cards are gone, so nothing is hovered any more
  useEffect(() => {
    setHovering(false);
    setKeyboardFocus(false);
  }, [person.id]);

  const ringItemProps = (index: number) => ({
    ref: itemRef(index),
    className: styles.planetSlot,
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType !== 'touch') setHovering(true);
    },
    onPointerLeave: () => setHovering(false),
    // tabbing to a card behind the centre turns the ring until it faces you
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (hasKeyboardFocus(event.target)) {
        setKeyboardFocus(true);
        bringToFront(index);
      }
    },
    onBlur: () => setKeyboardFocus(false),
  });

  const lookFor = (id: string): DropLook => {
    if (!drag) return undefined;
    if (drag.id === id) return 'dragging';
    if (drag.overId === id) return 'over';
    return canDrop(drag.id, id) ? 'target' : 'blocked';
  };
  const dragged = drag ? org.byId.get(drag.id) : undefined;
  const pendingPerson = pending ? org.byId.get(pending.id) : undefined;
  const pendingTarget = pending ? org.byId.get(pending.to) : undefined;

  const extras = (
    <>
      {drag &&
        dragged &&
        createPortal(
          <DragGhost employee={dragged} x={drag.x} y={drag.y} over={Boolean(drag.overId)} />,
          document.body,
        )}
      {pendingPerson && pendingTarget && (
        <MoveEmployeeDialog
          employee={pendingPerson}
          from={pendingPerson.managerId ? org.byId.get(pendingPerson.managerId) : undefined}
          to={pendingTarget}
          onClose={() => setPending(null)}
        />
      )}
      <p className={styles.hint}>
        {stacked || reports.length === 0
          ? 'Tip: drag someone onto another card to change who they report to.'
          : 'Tip: drag the space around the orbit to spin it, or drag someone onto another card to change who they report to.'}
      </p>
    </>
  );

  const centre = (
    <div
      ref={centreRef}
      tabIndex={-1}
      data-drop-id={person.id}
      className={[
        styles.focus,
        stacked && styles.focusStacked,
        lookFor(person.id) && styles[`centre-${lookFor(person.id)}`],
      ]
        .filter(Boolean)
        .join(' ')}
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
                dropLook={lookFor(manager.id)}
                dragHandles={handlesFor(manager.id)}
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
                    dropLook={lookFor(report.id)}
                    dragHandles={handlesFor(report.id)}
                  />
                ))}
                {overflow && <MoreNode count={reports.length - shown.length} onClick={onShowAll} />}
              </div>
            </>
          ) : (
            <p className={styles.emptyStacked}>Nobody reports to {person.firstName} yet.</p>
          )}
        </div>
        {extras}
      </section>
    );
  }

  // the top of the org has no manager card above, so slide everything up into that space
  const shift = manager ? 0 : MANAGER_BOTTOM - 20;
  // and someone with no team has no ring below, so the stage can end under the message
  const height = (reports.length > 0 ? STAGE_HEIGHT : SUN_Y + CENTRE_HALF_HEIGHT + 90) - shift;

  return (
    <section ref={boxRef} className={styles.box} aria-label={label}>
      <div className={styles.fit} style={{ width: STAGE_WIDTH * scale, height: height * scale }}>
        {/* key on the person so everything animates in again when you move */}
        <div
          className={[styles.stage, styles.space, spinning && styles.spinning]
            .filter(Boolean)
            .join(' ')}
          key={person.id}
          data-orbit-stage=""
          style={{ height: STAGE_HEIGHT, transform: `scale(${scale}) translateY(${-shift}px)` }}
          {...spinHandlers}
        >
          {reports.length > 0 && (
            <div
              className={styles.orbitPath}
              aria-hidden="true"
              style={{
                left: RING.cx - RING.rx,
                top: RING.cy - RING.ry,
                width: RING.rx * 2,
                height: RING.ry * 2,
              }}
            />
          )}

          {manager && (
            <div
              className={styles.link}
              style={{
                left: CX - 3,
                top: MANAGER_BOTTOM,
                width: 6,
                height: SUN_Y - CENTRE_HALF_HEIGHT - MANAGER_BOTTOM,
              }}
            />
          )}

          {manager && (
            <PersonNode
              employee={manager}
              teamSize={org.reportsOf(manager.id).length}
              onSelect={select}
              label="Reports to"
              style={{
                position: 'absolute',
                left: CX - 70,
                top: 4,
                zIndex: CENTRE_Z + 200,
              }}
              dropLook={lookFor(manager.id)}
              dragHandles={handlesFor(manager.id)}
            />
          )}

          <div
            className={styles.sun}
            style={{
              left: CX - CENTRE_WIDTH / 2,
              top: SUN_Y - CENTRE_HALF_HEIGHT,
              width: CENTRE_WIDTH,
              zIndex: CENTRE_Z,
            }}
          >
            {centre}
          </div>

          {shown.map((report, i) => (
            <div key={report.id} {...ringItemProps(i)}>
              <PersonNode
                employee={report}
                teamSize={org.reportsOf(report.id).length}
                onSelect={select}
                style={{ animationDelay: `${60 + i * 50}ms` }}
                dropLook={lookFor(report.id)}
                dragHandles={handlesFor(report.id)}
                moons
              />
            </div>
          ))}

          {overflow && (
            <div {...ringItemProps(shown.length)}>
              <MoreNode count={reports.length - shown.length} onClick={onShowAll} />
            </div>
          )}

          {reports.length === 0 && (
            <p className={styles.empty} style={{ top: SUN_Y + CENTRE_HALF_HEIGHT + 32 }}>
              Nobody reports to {person.firstName} yet.
            </p>
          )}
        </div>
      </div>
      {extras}
    </section>
  );
}
