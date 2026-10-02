import { defineConfig } from 'tsup';

// Dual ESM + CommonJS build: Vite consumes ESM, the NestJS API consumes CommonJS.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
});
