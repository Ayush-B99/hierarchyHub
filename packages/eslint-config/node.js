import globals from 'globals';
import tseslint from 'typescript-eslint';
import { baseConfig } from './base.js';

/** Node services and libraries (NestJS API, shared package). */
export const nodeConfig = tseslint.config(...baseConfig, {
  languageOptions: { globals: { ...globals.node } },
  rules: {
    // NestJS relies on runtime class references for dependency injection, so
    // auto-converting injected classes to `import type` would break it.
    '@typescript-eslint/consistent-type-imports': 'off',
  },
});

export default nodeConfig;
