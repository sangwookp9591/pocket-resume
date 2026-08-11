// ESLint 10 flat config.
//
// **타입 인식 규칙(projectService)은 켜지 않습니다.** typescript-eslint 8.67은
// peer로 typescript <6.1을 요구하는데 이 저장소는 7.0.2를 씁니다. 구문 파싱은
// 문제없이 돌지만 타입 인식 규칙은 컴파일러 API에 직접 붙으므로 신뢰할 수 없습니다.
// 타입 검사는 `npm run typecheck`(tsc 7)가 하고, ESLint는 구문·스타일만 봅니다.
// typescript-eslint가 TS 7을 지원하면 projectService를 켜면 됩니다.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import next from '@next/eslint-plugin-next';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'scripts/assets/raw/**', 'next-env.d.ts'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // 규칙은 이 프로젝트가 실제로 겪은 사고에서만 골랐습니다. 기본값 나열은 하지 않습니다.
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // 빈 catch는 이 저장소에서 의도적입니다(localStorage·컨텍스트 정리). 주석을 강제합니다.
      'no-empty': ['error', { allowEmptyCatch: false }],
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      // any는 금지하지 않되 눈에 띄게 둡니다 — 셰이더·캔버스 경계에서 불가피한 곳이 있습니다.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },

  {
    files: ['components/**/*.tsx', 'app/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, '@next/next': next },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      // 픽셀 에셋은 next/image를 타면 흐려집니다. next.config.js에서 최적화를 껐고
      // 의도적으로 <img>를 씁니다 — 이 규칙은 여기서 틀렸습니다.
      '@next/next/no-img-element': 'off',
    },
  },

  {
    // 빌드·린트 스크립트. node에서 직접 돌아가는 순수 JS입니다.
    files: ['scripts/**/*.{mjs,js}', '*.config.{js,mjs}'],
    languageOptions: { globals: globals.node, sourceType: 'module' },
    rules: { 'no-console': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },

  {
    files: ['test/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },

  {
    files: ['lib/engine/**/*.ts'],
    rules: {
      // 렌더러는 WebGPU/WebGL2/Canvas2D 세 백엔드를 한 인터페이스로 묶습니다.
      // 세 API의 타입이 겹치지 않아 경계에서 any가 나옵니다.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
