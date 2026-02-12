import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nx/**',
      '**/coverage/**',
      '**/.next/**',
      '**/build/**',
      '**/*.js', // Ignore generated JS files
      '!eslint.config.js', // But include this config file
    ],
  },

  // Base JavaScript/TypeScript config
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Global rules for all TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.base.json',
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],

      // Code quality rules
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // Readability rules
      'max-lines': ['warn', { max: 500, skipComments: true, skipBlankLines: true }],
      'max-depth': ['warn', 4],
      complexity: ['warn', 15],
      'no-duplicate-imports': 'error',
    },
  },

  // Relaxed rules for test files
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.tsx', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Allow 'any' in tests
      '@typescript-eslint/explicit-function-return-type': 'off',
      'max-lines': 'off',
      complexity: 'off',
    },
  },

  // Relaxed rules for migration files
  {
    files: ['**/migrations/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Relaxed rules for config files
  {
    files: ['**/ormconfig.ts', '**/*.config.ts', '**/*.config.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  },

  // React/Next.js specific rules for frontend
  {
    files: ['apps/web/**/*.tsx', 'apps/admin/**/*.tsx', 'libs/ui/**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off', // React components don't need explicit return types
    },
  },

  // Prettier integration (must be last)
  prettier,
];
