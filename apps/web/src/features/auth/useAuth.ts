import type { Me } from '@hierarchy-hub/shared';
import { createContext, useContext } from 'react';

export const ME = ['me'] as const;

export interface AuthState {
  /** who is signed in, or null */
  me: Me | null;
  /** still asking the api */
  loading: boolean;
  signedIn: (me: Me) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error('useAuth needs an AuthProvider above it');
  return state;
}
