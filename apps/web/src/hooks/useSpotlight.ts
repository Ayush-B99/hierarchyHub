import { useCallback, type PointerEvent } from 'react';

/**
 * Soft light that follows the cursor across a panel (React Bits "Spotlight Card" style).
 * Spread the returned handler onto the element and give it the `spotlight` class.
 */
export function useSpotlight() {
  return useCallback((event: PointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    el.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }, []);
}
