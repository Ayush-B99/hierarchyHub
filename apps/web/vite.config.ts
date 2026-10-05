/// <reference types="vitest/config" />
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * public/mockServiceWorker.js is only for the mock api in development and tests (adr 0008).
 * vite copies everything in public/ into the build, so remove it there: production never
 * registers it, and shipping it would suggest the live site uses mocked data
 */
function dropMockWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'drop-mock-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      rmSync(resolve(outDir, 'mockServiceWorker.js'), { force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), dropMockWorker()],
  server: {
    port: 5173,
    // In development, /api calls go to the local NestJS server, so no CORS setup is needed.
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    testTimeout: 15_000,
  },
});
