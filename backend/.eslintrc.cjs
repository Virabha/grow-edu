// ESLint config for NestJS 10 + TypeScript backend.
// Using .eslintrc.cjs (ESLint 8 legacy format) instead of flat config because
// flat config in ESLint 8 requires the ESLINT_USE_FLAT_CONFIG=true env var and
// is not the stable default until ESLint 9.
'use strict';

module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // Turns off ESLint formatting rules that conflict with Prettier
    'prettier',
  ],
  rules: {
    // NestJS decorators and DI make empty constructors common and intentional
    '@typescript-eslint/no-empty-function': 'off',

    // Promoted from 'warn' to 'error': the codebase reached ZERO explicit any.
    // The count went 51 -> 0 by giving values real types (Drizzle enum unions,
    // $inferSelect for cache generics, the UserRole enum for @Roles). Keeping
    // this at 'warn' would let the count creep back up silently.
    '@typescript-eslint/no-explicit-any': 'error',

    // A non-null assertion is a promise to the compiler that it cannot check.
    // Every one is a place where narrowing would have been the honest fix.
    '@typescript-eslint/no-non-null-assertion': 'error',

    // No @ts-ignore. @ts-expect-error is permitted only with a description,
    // because it fails loudly once the underlying problem is fixed.
    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
    ],

    // NestJS uses namespace-style imports from rxjs etc; these are fine
    '@typescript-eslint/no-namespace': 'off',

    // Allow parameters prefixed with _ to signal intentional non-use
    // (standard TypeScript/ESLint convention for overriding parent signatures)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'drizzle/', 'scripts/'],
};
