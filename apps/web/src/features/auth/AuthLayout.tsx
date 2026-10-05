import type { ReactNode } from 'react';
import { ClayBackground } from '../../components/background/ClayBackground';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { Panel } from '../../components/ui/Panel';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './AuthLayout.module.css';

/** the frame around the sign in and sign up forms: the clay background and one glass card */
export function AuthLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  useDocumentTitle(`${title} · Hierarchy Hub`);
  return (
    <>
      <ClayBackground />
      <main className={styles.page}>
        <div className={styles.theme}>
          <ThemeToggle />
        </div>
        <Panel as="section" className={styles.card} aria-labelledby="auth-title">
          <p className={styles.brand}>
            <span className={styles.logo} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="6" r="3.2" fill="currentColor" />
                <circle cx="5" cy="14.5" r="2.6" fill="currentColor" opacity=".45" />
                <circle cx="15" cy="14.5" r="2.6" fill="currentColor" opacity=".45" />
              </svg>
            </span>
            Hierarchy Hub
          </p>
          <h1 id="auth-title" className={styles.title}>
            {title}
          </h1>
          <p className={styles.intro}>{intro}</p>
          {children}
        </Panel>
      </main>
    </>
  );
}
