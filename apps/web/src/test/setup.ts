import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '../mocks/db';
import { server } from '../mocks/node';

// jsdom has no WebGL, so skip the 3D background in tests.
vi.mock('../components/background/ClayBackground', () => ({ ClayBackground: () => null }));

// jsdom does not implement matchMedia.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => db.reset());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
});
afterAll(() => server.close());
