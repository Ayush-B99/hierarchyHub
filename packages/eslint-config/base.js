import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/** Rules shared by every package. Formatting is left to Prettier. */
export const baseConfig = tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/.turbo/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  prettier,
);

export default baseConfig;
