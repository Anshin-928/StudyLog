import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'src/types/supabase.ts']),
  {
    files: ['api/**/*.js', 'scripts/**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    // TODO: 既存コードの違反を解消したら error に戻す（導入時点で warn に緩和）
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    files: ['e2e/**/*.ts', '*.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  // 整形ルールはPrettierに任せるため、競合するESLintルールを無効化する（必ず最後に置く）
  prettier,
]);
