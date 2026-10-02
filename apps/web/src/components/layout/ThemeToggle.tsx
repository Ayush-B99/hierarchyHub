import { useTheme } from '../../theme/useTheme';
import { Puck } from '../ui/Puck';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <Puck
      size="sm"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
    >
      {dark ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="4" />
          <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6 16 16M4 16l1.4-1.4M14.6 5.4 16 4" />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9z" />
        </svg>
      )}
    </Puck>
  );
}
