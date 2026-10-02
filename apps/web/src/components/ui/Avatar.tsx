import { useEffect, useState } from 'react';
import { gravatarUrl } from '../../lib/gravatar';
import styles from './Avatar.module.css';

interface AvatarProps {
  email: string;
  firstName: string;
  lastName: string;
  /** Diameter in pixels. */
  size?: number;
}

const TONES = 5;

function toneFor(text: string): string {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `var(--t${(hash % TONES) + 1})`;
}

/**
 * Shows the employee's Gravatar picture (FR-15). While it loads, or when they have
 * no Gravatar, it shows a soft disc with their initials instead.
 *
 * it's purely decorative since the name is always shown next to it,
 * so screen readers skip it instead of hearing the name twice
 */
export function Avatar({ email, firstName, lastName, size = 40 }: AvatarProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    gravatarUrl(email, size * 2).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [email, size]);

  const lastWord = lastName.trim().split(/\s+/).pop() ?? '';
  const initials = `${firstName.charAt(0)}${lastWord.charAt(0)}`.toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        background: toneFor(email),
      }}
    >
      <span>{initials}</span>
      {src && !failed && (
        <img
          className={styles.image}
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
