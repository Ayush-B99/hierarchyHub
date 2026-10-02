import { NavLink, Outlet } from 'react-router';
import { ClayBackground } from '../background/ClayBackground';
import { Panel } from '../ui/Panel';
import styles from './AppShell.module.css';
import { ThemeToggle } from './ThemeToggle';

/** Moving background, floating glass navigation and the current page. */
export function AppShell() {
  return (
    <>
      <ClayBackground />
      <div className={styles.app}>
        <a className={styles.skip} href="#main">
          Skip to content
        </a>
        <div className={styles.navWrap}>
          <Panel as="header" spotlight className={styles.nav}>
            <NavLink to="/" className={styles.brand}>
              <span className={styles.logo} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="6" r="3.2" fill="currentColor" />
                  <circle cx="5" cy="14.5" r="2.6" fill="currentColor" opacity=".45" />
                  <circle cx="15" cy="14.5" r="2.6" fill="currentColor" opacity=".45" />
                </svg>
              </span>
              Hierarchy Hub
            </NavLink>
            <nav aria-label="Main" className={styles.tabs}>
              <NavLink to="/" end className={styles.tab}>
                Explore
              </NavLink>
              <NavLink to="/people" className={styles.tab}>
                People
              </NavLink>
            </nav>
            <div className={styles.end}>
              <ThemeToggle />
            </div>
          </Panel>
        </div>
        <main id="main" className={styles.main}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
