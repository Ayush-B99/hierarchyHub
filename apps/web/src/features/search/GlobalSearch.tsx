import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { Avatar } from '../../components/ui/Avatar';
import { fullName } from '../../lib/format';
import { useHierarchy } from '../employees/queries';
import styles from './GlobalSearch.module.css';
import { searchPeople, splitMatch } from './searchPeople';

/** true when the user is already typing somewhere, so the / shortcut shouldn't steal it */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(
    el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)),
  );
}

/**
 * search everyone from the top bar and jump to them in explore (fr-08)
 * follows the aria combobox pattern so arrow keys, enter and escape work like people expect
 */
export function GlobalSearch() {
  const { data: everyone = [] } = useHierarchy();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(() => searchPeople(everyone, query), [everyone, query]);
  const showList = open && query.trim().length > 0;

  // "/" or cmd/ctrl + k jumps to the search from anywhere
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const shortcut =
        (event.key === '/' && !isTyping(event.target)) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k');
      if (shortcut) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const choose = (id: string) => {
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/?person=${id}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      const pick = results[active];
      if (pick) {
        event.preventDefault();
        choose(pick.id);
      }
    } else if (event.key === 'Escape') {
      // first escape clears, second one leaves the box
      if (query) setQuery('');
      else inputRef.current?.blur();
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div className={styles.search}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        Find someone
      </label>
      <svg
        className={styles.icon}
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <circle cx="7.5" cy="7.5" r="5.5" />
        <path d="M12 12l4.5 4.5" />
      </svg>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        className={styles.input}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? optionId(active) : undefined}
        placeholder="Find someone"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // a short delay so a click on a result still lands before the list closes
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {!query && (
        <kbd className={styles.key} aria-hidden="true">
          /
        </kbd>
      )}
      {showList && (
        <ul id={listId} role="listbox" aria-label="Matching people" className={styles.list}>
          {results.length === 0 ? (
            <li className={styles.empty} role="presentation">
              Nobody matches "{query.trim()}".
            </li>
          ) : (
            results.map((person, index) => {
              const [before, match, after] = splitMatch(fullName(person), query);
              return (
                <li
                  key={person.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  // the bold match splits the name into pieces, so give screen readers the whole thing
                  aria-label={`${fullName(person)}, ${person.role}, ${person.employeeNumber}`}
                  className={styles.option}
                  // stops the input losing focus before the click registers
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(person.id)}
                >
                  <Avatar
                    email={person.email}
                    firstName={person.firstName}
                    lastName={person.lastName}
                    size={34}
                  />
                  <span>
                    <span className={styles.name}>
                      {before}
                      {match && <mark>{match}</mark>}
                      {after}
                    </span>
                    <span className={styles.meta}>
                      {person.role}, {person.employeeNumber}
                    </span>
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
