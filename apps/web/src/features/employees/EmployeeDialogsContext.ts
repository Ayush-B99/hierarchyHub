import { createContext } from 'react';
import type { FieldName } from './formModel';

export interface EmployeeDialogs {
  openAdd: () => void;
  openEdit: (id: string, focus?: FieldName) => void;
  openDelete: (id: string) => void;
}

export const EmployeeDialogsContext = createContext<EmployeeDialogs | null>(null);
