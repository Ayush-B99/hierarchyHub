import { changeTimes, type OrgChange } from '@hierarchy-hub/shared';
import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../../lib/api';

export const HISTORY = ['history'] as const;

export const PastContext = createContext<string | null>(null);

export const usePast = () => useContext(PastContext);

export interface TimeTravel {
  at: string | null;
  setAt: (at: string | null) => void;
  times: string[];
  changes: OrgChange[];
}

export function useTimeTravel(): TimeTravel {
  const [params, setParams] = useSearchParams();
  const at = params.get('at');
  const history = useQuery({ queryKey: HISTORY, queryFn: api.history, staleTime: 30_000 });
  const changes = useMemo(() => history.data ?? [], [history.data]);
  const times = useMemo(() => changeTimes(changes), [changes]);

  const setAt = useCallback(
    (value: string | null) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) next.set('at', value);
          else next.delete('at');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  return { at, setAt, times, changes };
}
