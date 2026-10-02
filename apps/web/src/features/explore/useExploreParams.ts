import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export type ExploreView = 'orbit' | 'levels';

/**
 * the selected person and view live in the url (?person=...&view=levels)
 * so the back button works and you can send someone a link straight to a person
 */
export function useExploreParams() {
  const [params, setParams] = useSearchParams();
  const personId = params.get('person');
  const view: ExploreView = params.get('view') === 'levels' ? 'levels' : 'orbit';

  const selectPerson = useCallback(
    (id: string) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('person', id);
        return next;
      }),
    [setParams],
  );

  const setView = useCallback(
    (nextView: ExploreView) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        // orbit is the default so we keep the url tidy and leave it out
        if (nextView === 'orbit') next.delete('view');
        else next.set('view', nextView);
        return next;
      }),
    [setParams],
  );

  return { personId, view, selectPerson, setView };
}
