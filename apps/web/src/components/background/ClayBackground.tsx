import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useTheme } from '../../theme/useTheme';
import type { ClayScene } from './clayScene';
import styles from './ClayBackground.module.css';

/**
 * Slowly moving 3D clay shapes behind the whole app. Three.js is loaded on demand
 * so it never delays the first paint. Shows still shapes if WebGL is unavailable,
 * and stops moving when the user prefers reduced motion.
 */
export function ClayBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ClayScene | null>(null);
  const [failed, setFailed] = useState(false);
  const { theme } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    import('./clayScene')
      .then(({ createClayScene }) => {
        if (cancelled) return;
        sceneRef.current = createClayScene(canvas, {
          dark: themeRef.current === 'dark',
          animate: !reducedMotion,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    sceneRef.current?.setTheme(theme === 'dark');
  }, [theme]);

  if (failed) {
    return (
      <div className={styles.fallback} aria-hidden="true">
        <span className={styles.one} />
        <span className={styles.two} />
        <span className={styles.ball} />
      </div>
    );
  }

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
