import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders } from './app/AppProviders';
import { routes } from './app/routes';
import { createQueryClient } from './lib/queryClient';
import './styles/global.css';

/**
 * In development the mock API (MSW) answers /api requests until the real API is built.
 * `import.meta.env.DEV` is false in production builds, so Vite removes the mocks entirely.
 */
async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKING === 'false') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

void enableMocking().then(() => {
  createRoot(root).render(
    <StrictMode>
      <AppProviders client={createQueryClient()}>
        <RouterProvider router={createBrowserRouter(routes)} />
      </AppProviders>
    </StrictMode>,
  );
});
