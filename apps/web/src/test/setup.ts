import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { accounts } from '../mocks/accounts';
import { db } from '../mocks/db';
import { server } from '../mocks/node';

// findBy and waitFor give up after 1 second by default. every page now waits for the
// "who's signed in" check before loading, and a busy laptop running every test file at once
// can take longer than that while still working fine
configure({ asyncUtilTimeout: 5000 });

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

// jsdom has no PointerEvent, so pointer events would arrive without a button or position
if (!('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    pointerType: string;
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? 'mouse';
      this.pointerId = init.pointerId ?? 1;
    }
  }
  Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill, writable: true });
}

// jsdom doesn't do <dialog> popups yet, so give it just enough to open and close
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
    // real browsers focus the first focusable thing inside, copy that so tests catch focus bugs
    this.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]')?.focus();
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  db.reset();
  // every test starts signed in as the ceo, an admin, unless it signs in as someone else
  accounts.reset();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
});
afterAll(() => server.close());
