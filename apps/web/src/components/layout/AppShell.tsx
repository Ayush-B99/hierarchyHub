import { NavLink, Outlet, useNavigate } from 'react-router';
import { EmployeeDialogsProvider } from '../../features/employees/EmployeeDialogsProvider';
import { useEmployeeDialogs } from '../../features/employees/useEmployeeDialogs';
import { useAuth } from '../../features/auth/useAuth';
import { GlobalSearch } from '../../features/search/GlobalSearch';
import { ClayBackground } from '../background/ClayBackground';
import { Magnet } from '../motion/Magnet';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import styles from './AppShell.module.css';
import { ThemeToggle } from './ThemeToggle';

/** Moving background, floating glass navigation and the current page. */
export function AppShell() {
  const { me } = useAuth();
  return (
    <EmployeeDialogsProvider>
      <ClayBackground />
      <div className={styles.app}>
        <a className={styles.skip} href="#main">
          Skip to content
        </a>
        <div className={styles.navWrap}>
          {/* no spotlight here, it clips the overflow and would hide the search results dropdown */}
          <Panel as="header" className={styles.nav}>
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
              {me?.isAdmin && (
                <NavLink to="/accounts" className={styles.tab}>
                  Accounts
                </NavLink>
              )}
              {me?.isAdmin && (
                <NavLink to="/audit" className={styles.tab}>
                  Audit
                </NavLink>
              )}
            </nav>
            <div className={styles.end}>
              <GlobalSearch />
              {/* the api checks this too, this just hides a button that would be refused */}
              {me?.isAdmin && <AddEmployeeButton />}
              <ThemeToggle />
              <AccountMenu />
            </div>
          </Panel>
        </div>
        <main id="main" className={styles.main}>
          <Outlet />
        </main>
      </div>
    </EmployeeDialogsProvider>
  );
}

function AddEmployeeButton() {
  const { openAdd } = useEmployeeDialogs();
  return (
    <Magnet>
      <Button variant="primary" onClick={openAdd}>
        Add employee
      </Button>
    </Magnet>
  );
}

function AccountMenu() {
  const { me, signOut } = useAuth();
  const navigate = useNavigate();
  if (!me) return null;
  return (
    <div className={styles.account}>
      <span className={styles.accountName} title={me.email}>
        {me.name}
        {me.isAdmin && <span className={styles.badge}>Admin</span>}
      </span>
      <Button
        onClick={async () => {
          await signOut();
          navigate('/signin', { replace: true });
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
