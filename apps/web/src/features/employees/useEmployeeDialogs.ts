import { useContext } from 'react';
import { EmployeeDialogsContext } from './EmployeeDialogsContext';

/** open the add, edit or delete popups from anywhere in the app */
export function useEmployeeDialogs() {
  const value = useContext(EmployeeDialogsContext);
  if (!value) throw new Error('useEmployeeDialogs must be used inside <EmployeeDialogsProvider>');
  return value;
}
