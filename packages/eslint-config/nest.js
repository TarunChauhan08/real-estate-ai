import globals from 'globals';
import tseslint from 'typescript-eslint';
import { base } from './base.js';

/** NestJS API rules. Decorator metadata needs real (non-type) imports for DI. */
export default tseslint.config(...base, {
  languageOptions: { globals: { ...globals.node, ...globals.jest } },
  rules: {
    // Nest relies on emitDecoratorMetadata; type-only imports would break DI.
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/no-extraneous-class': 'off',
  },
});
