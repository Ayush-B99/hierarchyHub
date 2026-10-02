import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

interface CountUpProps {
  value: number;
  /** how long the count takes, in ms */
  duration?: number;
}

/**
 * counts from 0 up to the value, like react bits' count up
 * the real number is always there for screen readers and tests, only the visual part animates
 */
export function CountUp({ value, duration = 700 }: CountUpProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion || value === 0) {
      setShown(value);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const step = (time: number) => {
      start ??= time;
      const progress = Math.min((time - start) / duration, 1);
      // ease out so it slows down nicely at the end
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    setShown(0);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reducedMotion]);

  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}
