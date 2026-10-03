import { useEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import styles from './Magnet.module.css';

interface MagnetProps {
  children: ReactNode;
  /** how far around the element it starts pulling, in px */
  reach?: number;
  /** how strongly it follows, 0 to 1 */
  strength?: number;
}

/**
 * gently pulls whatever's inside towards the cursor when it gets close, like react bits' magnet
 * mouse only, and it switches off for people who prefer reduced motion
 */
export function Magnet({ children, reach = 60, strength = 0.22 }: MagnetProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const box = el.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const near = Math.abs(dx) < box.width / 2 + reach && Math.abs(dy) < box.height / 2 + reach;
      el.style.transform = near ? `translate(${dx * strength}px, ${dy * strength}px)` : '';
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      el.style.transform = '';
    };
  }, [reach, strength, reducedMotion]);

  return (
    <span ref={ref} className={styles.magnet}>
      {children}
    </span>
  );
}
