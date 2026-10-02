import { Fragment } from 'react';
import styles from './SplitText.module.css';

interface SplitTextProps {
  text: string;
  /** gap between each word starting, in ms */
  stagger?: number;
}

/**
 * words rise in one after another, like react bits' split text
 * screen readers get the plain sentence, the animated words are hidden from them
 */
export function SplitText({ text, stagger = 70 }: SplitTextProps) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    // key on the text so the animation replays whenever it changes
    <span key={text}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <Fragment key={`${word}-${i}`}>
            {i > 0 && ' '}
            <span className={styles.word} style={{ animationDelay: `${i * stagger}ms` }}>
              {word}
            </span>
          </Fragment>
        ))}
      </span>
    </span>
  );
}
