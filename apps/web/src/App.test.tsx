import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the API as online when the health check succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          status: 'ok',
          service: 'hierarchy-hub-api',
          version: '1.2.3',
          timestamp: new Date().toISOString(),
        }),
      }),
    );

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Hierarchy Hub' })).toBeInTheDocument();
    expect(await screen.findByText('API online (v1.2.3)')).toBeInTheDocument();
  });

  it('shows the API as offline when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    render(<App />);
    expect(await screen.findByText(/API offline/)).toBeInTheDocument();
  });
});
