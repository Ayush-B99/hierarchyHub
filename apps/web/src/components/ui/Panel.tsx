import type { ElementType, HTMLAttributes, PointerEvent } from 'react';
import { useSpotlight } from '../../hooks/useSpotlight';
import styles from './Panel.module.css';

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** `glass` floats over the background. `solid` is for content that must be easy to read, like tables. */
  variant?: 'glass' | 'solid';
  /** Adds a soft light that follows the cursor. */
  spotlight?: boolean;
}

export function Panel({
  as: Tag = 'section',
  variant = 'glass',
  spotlight = false,
  className,
  onPointerMove,
  ...rest
}: PanelProps) {
  const track = useSpotlight();
  const classes = [styles[variant], spotlight && styles.spotlight, className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag
      className={classes}
      onPointerMove={
        spotlight
          ? (e: PointerEvent<HTMLElement>) => {
              track(e);
              onPointerMove?.(e);
            }
          : onPointerMove
      }
      {...rest}
    />
  );
}
