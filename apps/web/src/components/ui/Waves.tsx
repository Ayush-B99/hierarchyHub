import { useId } from 'react';
import styles from './Waves.module.css';

const BANDS = [
  'M0 260 C 120 170, 220 90, 360 70 C 470 55, 540 20, 600 0 L 600 260 Z',
  'M90 260 C 190 190, 280 130, 400 112 C 500 98, 560 70, 600 52 L 600 260 Z',
  'M180 260 C 260 210, 340 165, 450 150 C 530 140, 575 120, 600 108 L 600 260 Z',
  'M260 260 C 330 222, 400 196, 480 190 C 545 185, 580 172, 600 164 L 600 260 Z',
  'M330 260 C 390 236, 450 224, 520 222 C 560 221, 585 214, 600 208 L 600 260 Z',
];

interface WavesProps {
  className?: string;
  /** Adds the small glossy ball accent. */
  ball?: boolean;
}

/** Decorative sculpted wave bands from the design reference. Colours come from the theme tokens. */
export function Waves({ className, ball = false }: WavesProps) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={[styles.art, className].filter(Boolean).join(' ')} aria-hidden="true">
      <svg viewBox="0 0 600 260" preserveAspectRatio="xMaxYMax slice">
        <defs>
          <filter id={`${id}-shadow`} x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow
              dx="-6"
              dy="-10"
              stdDeviation="12"
              floodColor="#000"
              floodOpacity="0.14"
            />
          </filter>
          <radialGradient id={`${id}-ball`} cx="35%" cy="30%" r="70%">
            <stop offset="0" style={{ stopColor: 'var(--pearl-a)' }} />
            <stop offset="1" style={{ stopColor: 'var(--pearl-b)' }} />
          </radialGradient>
          {BANDS.map((_, i) => (
            <linearGradient key={i} id={`${id}-band${i + 1}`} x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0" style={{ stopColor: `var(--w${i + 1}a)` }} />
              <stop offset="1" style={{ stopColor: `var(--w${i + 1}b)` }} />
            </linearGradient>
          ))}
        </defs>
        {BANDS.map((d, i) => (
          <path key={i} d={d} fill={`url(#${id}-band${i + 1})`} filter={`url(#${id}-shadow)`} />
        ))}
        {ball && (
          <circle cx="548" cy="46" r="15" fill={`url(#${id}-ball)`} filter={`url(#${id}-shadow)`} />
        )}
      </svg>
    </div>
  );
}
