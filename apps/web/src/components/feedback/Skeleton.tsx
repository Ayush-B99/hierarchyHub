import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

/** a grey shimmering placeholder in the shape of what's about to load */
export function Bone({
  width = '100%',
  height = 16,
  radius,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className={styles.bone}
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    />
  );
}
