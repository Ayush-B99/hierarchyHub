import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Me } from '@hierarchy-hub/shared';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { api, ApiError, SIGNED_OUT } from '../../lib/api';
import { AuthContext, ME, type AuthState } from './useAuth';

/**
 * knows who is signed in. asks the api once when the app opens, and drops everything the
 * moment any request says the session has ended, so nobody keeps seeing data after that
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery<Me | null>({
    queryKey: ME,
    // a 401 here just means nobody is signed in, not an error
    queryFn: () =>
      api.me().catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }),
    staleTime: Infinity,
    retry: false,
  });

  const forget = useCallback(() => {
    // clear every cached employee too, the next person to sign in mustn't see them
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== ME[0] });
    queryClient.setQueryData(ME, null);
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener(SIGNED_OUT, forget);
    return () => window.removeEventListener(SIGNED_OUT, forget);
  }, [forget]);

  const value = useMemo<AuthState>(
    () => ({
      me: query.data ?? null,
      loading: query.isPending,
      signedIn: (me) => {
        queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== ME[0] });
        queryClient.setQueryData(ME, me);
      },
      signOut: async () => {
        await api.signOut().catch(() => undefined);
        forget();
      },
    }),
    [query.data, query.isPending, queryClient, forget],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
