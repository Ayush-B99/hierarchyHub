import type { Employee } from '@hierarchy-hub/shared';
import { Magnet } from '../../components/motion/Magnet';
import { SplitText } from '../../components/motion/SplitText';
import { Panel } from '../../components/ui/Panel';
import { Puck } from '../../components/ui/Puck';
import { Waves } from '../../components/ui/Waves';
import { fullName } from '../../lib/format';
import styles from './Hero.module.css';
import type { ExploreView } from './useExploreParams';

interface HeroProps {
  person: Employee;
  view: ExploreView;
  onViewChange: (view: ExploreView) => void;
}

const ORBIT_ICON = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3.5" />
    <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    <circle cx="20.5" cy="9" r="1.6" fill="currentColor" />
  </svg>
);

const LEVELS_ICON = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="5" height="16" rx="2" />
    <rect x="10" y="4" width="5" height="16" rx="2" />
    <rect x="17" y="4" width="4" height="16" rx="2" />
  </svg>
);

/** the big wavy card at the top with the selected person's name and the view switch */
export function Hero({ person, view, onViewChange }: HeroProps) {
  return (
    <section className={styles.hero} aria-label="Selected person">
      <Waves className={styles.waves} ball />
      <Panel as="div" className={styles.title}>
        <h1>
          <SplitText text={fullName(person)} />
        </h1>
        <p className={styles.role}>{person.role}</p>
      </Panel>
      <div className={styles.views} role="group" aria-label="Choose a view">
        <span className={styles.view}>
          <Magnet>
            <Puck
              size="lg"
              aria-label="Orbit view"
              pressed={view === 'orbit'}
              onClick={() => onViewChange('orbit')}
            >
              {ORBIT_ICON}
            </Puck>
          </Magnet>
          <span aria-hidden="true">Orbit</span>
        </span>
        <span className={styles.view}>
          <Magnet>
            <Puck
              size="lg"
              aria-label="Levels view"
              pressed={view === 'levels'}
              onClick={() => onViewChange('levels')}
            >
              {LEVELS_ICON}
            </Puck>
          </Magnet>
          <span aria-hidden="true">Levels</span>
        </span>
      </div>
    </section>
  );
}
