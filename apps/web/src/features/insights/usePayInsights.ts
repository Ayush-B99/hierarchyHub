import {
  payFlags,
  teamSizes,
  trainPayModel,
  type PayFlag,
  type PayModel,
} from '@hierarchy-hub/shared';
import { useMemo } from 'react';
import { useHierarchy } from '../employees/queries';

export interface PayInsights {
  model: PayModel | null;
  flags: Map<string, PayFlag>;
  teamSizes: Map<string, number>;
}

export function usePayInsights(): PayInsights {
  const { data } = useHierarchy();

  return useMemo(() => {
    const people = data ?? [];
    const model = trainPayModel(people);
    const flags = model ? payFlags(people, model) : [];
    return {
      model,
      flags: new Map(flags.map((flag) => [flag.employeeId, flag])),
      teamSizes: teamSizes(people),
    };
  }, [data]);
}
