import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext } from './ToastContext';
import styles from './Toast.module.css';

const SHOW_FOR_MS = 3500;

interface Toast {
  id: number;
  message: string;
}

/** holds the little confirmation messages, the region is a live region so screen readers hear them */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string) => {
    const id = (nextId.current += 1);
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), SHOW_FOR_MS);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <span className={styles.dot} aria-hidden="true" />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
