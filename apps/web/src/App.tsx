import { healthResponseSchema, type HealthResponse } from '@hierarchy-hub/shared';
import { useEffect, useState } from 'react';
import { config } from './config';

type ApiState =
  { kind: 'checking' } | { kind: 'online'; health: HealthResponse } | { kind: 'offline' };

/** Placeholder shell. Real pages arrive in later parts. */
export function App() {
  const [api, setApi] = useState<ApiState>({ kind: 'checking' });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${config.apiUrl}/health`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setApi({ kind: 'online', health: healthResponseSchema.parse(json) }))
      .catch(() => {
        if (!controller.signal.aborted) setApi({ kind: 'offline' });
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <h1>Hierarchy Hub</h1>
      <p>Employee hierarchy management for EPI-USE Africa.</p>
      <p role="status" className={`status status-${api.kind}`}>
        {api.kind === 'checking' && 'Checking API…'}
        {api.kind === 'online' && `API online (v${api.health.version})`}
        {api.kind === 'offline' && 'API offline. Start it with pnpm dev.'}
      </p>
    </main>
  );
}
