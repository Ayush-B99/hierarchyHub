import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  size?: 'medium' | 'small';
  children: ReactNode;
}

/**
 * popup built on the browser's own <dialog>, which gives us focus trapping, the escape key
 * and a page behind it that can't be clicked, without having to hand roll any of that
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'medium',
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal moves focus to the first field it finds, which beats react's autoFocus,
      // so we put focus back where we actually want it. mark that element with data-autofocus
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={size === 'small' ? `${styles.dialog} ${styles.small}` : styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // escape key, we take over so react state stays the source of truth
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // a click on the dark area around the box lands on the dialog itself, treat it as cancel
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.inner}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className={styles.description}>
              {description}
            </p>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}

/** right aligned row of buttons at the bottom of a dialog */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
