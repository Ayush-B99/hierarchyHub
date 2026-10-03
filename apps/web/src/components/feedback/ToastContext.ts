import { createContext } from 'react';

export interface ToastContextValue {
  /** shows a short message at the bottom of the screen for a few seconds */
  showToast: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
