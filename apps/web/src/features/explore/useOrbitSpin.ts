import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { AUTO_SPEED, RING, frontAngleFor, placeOnRing, slotAngle, startAngle } from './orbitRing';

// fastest a flick can spin the ring, in radians a second
const MAX_FLING = 3;
// a release this long after the last movement means you stopped before letting go, so no glide
const STILL_MS = 80;

interface Options {
  /** how many cards are on the ring */
  count: number;
  /** changes when the centre person changes, so the ring starts fresh */
  resetKey: string;
  /** stop turning, eg while you hover a card, use the keyboard or drag someone */
  paused: boolean;
  /** the user asked their system for less motion: no turning on its own and no glide */
  reduced: boolean;
  /** how much the stage is shrunk to fit, so drags move the ring at the pointer's speed */
  scale: number;
}

/**
 * turns the orbit ring. it spins slowly on its own, you can drag empty space to spin it
 * yourself, and it glides to a stop when you let go. the cards are moved by writing their
 * styles directly on every frame, so react doesn't re-render 60 times a second
 */
export function useOrbitSpin({ count, resetKey, paused, reduced, scale }: Options) {
  const items = useRef<(HTMLElement | null)[]>([]);
  const angle = useRef(startAngle(count));
  const velocity = useRef(0);
  const target = useRef<number | null>(null);
  const spin = useRef<{ id: number; x: number; t: number } | null>(null);
  const [spinning, setSpinning] = useState(false);

  const settings = useRef({ count, paused, reduced, scale });
  settings.current = { count, paused, reduced, scale };

  const place = useCallback(() => {
    const n = settings.current.count;
    items.current.forEach((el, i) => {
      if (!el || i >= n) return;
      const p = placeOnRing(slotAngle(angle.current, i, n));
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${p.scale.toFixed(3)})`;
      el.style.opacity = p.opacity.toFixed(3);
      el.style.zIndex = String(p.zIndex);
    });
  }, []);

  // a new centre person or a different team size: start again from the front, before painting
  useLayoutEffect(() => {
    angle.current = startAngle(count);
    velocity.current = 0;
    target.current = null;
    place();
  }, [count, resetKey, place]);

  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return;
    let frame = 0;
    let last = performance.now();
    let placed = Number.NaN;

    const tick = (now: number) => {
      // cap the step so coming back to a background tab doesn't make the ring jump,
      // but leave room for slow machines that only manage 10 or so frames a second
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = settings.current;

      if (!spin.current) {
        if (target.current !== null) {
          // easing towards a card the keyboard asked to bring to the front
          const diff = target.current - angle.current;
          if (s.reduced || Math.abs(diff) < 0.001) {
            angle.current = target.current;
            target.current = null;
          } else {
            angle.current += diff * Math.min(1, dt * 7);
          }
          velocity.current = 0;
        } else {
          const wanted = s.paused || s.reduced ? 0 : AUTO_SPEED;
          // stop quickly when paused, so you're never clicking a moving card, but glide otherwise
          const rate = s.paused ? 9 : 1.2;
          velocity.current += (wanted - velocity.current) * Math.min(1, dt * rate);
          if (wanted === 0 && Math.abs(velocity.current) < 0.0005) velocity.current = 0;
          angle.current += velocity.current * dt;
        }
      }

      if (angle.current !== placed) {
        place();
        placed = angle.current;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [place]);

  /** spread onto the stage: dragging anywhere that isn't a person card spins the ring */
  const spinHandlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if ((event.target as Element).closest('button')) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      spin.current = { id: event.pointerId, x: event.clientX, t: performance.now() };
      target.current = null;
      velocity.current = 0;
      setSpinning(true);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const s = spin.current;
      if (!s || s.id !== event.pointerId) return;
      const now = performance.now();
      // drag right and the front of the ring follows you right
      const turned = -(event.clientX - s.x) / settings.current.scale / RING.rx;
      angle.current += turned;
      const seconds = Math.max(1, now - s.t) / 1000;
      velocity.current = velocity.current * 0.5 + (turned / seconds) * 0.5;
      spin.current = { id: s.id, x: event.clientX, t: now };
      place();
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => endSpin(event),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => endSpin(event),
  };

  function endSpin(event: PointerEvent<HTMLElement>) {
    const s = spin.current;
    if (!s || s.id !== event.pointerId) return;
    const held = performance.now() - s.t > STILL_MS;
    velocity.current =
      settings.current.reduced || held
        ? 0
        : Math.max(-MAX_FLING, Math.min(MAX_FLING, velocity.current));
    spin.current = null;
    setSpinning(false);
  }

  /** turn the ring the short way until card i faces you */
  const bringToFront = useCallback((index: number) => {
    target.current = frontAngleFor(index, settings.current.count, angle.current);
  }, []);

  /** ref for card i on the ring */
  const itemRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      items.current[index] = el;
    },
    [],
  );

  return { itemRef, spinHandlers, spinning, bringToFront };
}
