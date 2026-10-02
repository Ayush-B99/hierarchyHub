import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Same mock API, for Vitest. */
export const server = setupServer(...handlers);
