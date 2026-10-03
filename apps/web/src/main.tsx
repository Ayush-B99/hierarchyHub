import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders } from './app/AppProviders';
import { routes } from './app/routes';
import { createQueryClient } from './lib/queryClient';
import './styles/global.css';

/**
 * the app talks to the real api by default, in development through vite's proxy to
 * localhost:3000. set VITE_API_MOCKING=true (or run `task web:mock`) to use the mock api
 * instead, eg to work on screens without the backend running. `import.meta.env.DEV` is false
 * in production builds, so vite removes the mock from them entirely (adr 0008)
 */
async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKING !== 'true') return;
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
