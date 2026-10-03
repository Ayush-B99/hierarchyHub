import { defineConfig } from 'tsup';

// Dual ESM + CommonJS build: Vite consumes ESM, the NestJS API consumes CommonJS.
// In watch mode the old output is kept, so the API and web app never see an empty
// dist folder while they start up at the same time.
export default defineConfig((options) => ({
  entry: { index: 'src/index.ts', 'testing/index': 'src/testing/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: !options.watch,
  sourcemap: true,
}));
