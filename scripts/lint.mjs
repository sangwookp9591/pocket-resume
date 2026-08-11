/* ESLint 실행기.
 *
 * typescript-eslint 8.67은 TypeScript 7을 **거부합니다**(모든 진입점에 버전 가드가 있습니다).
 * 이 저장소의 타입 검사는 TS 7이 하므로 root의 `typescript`는 7.0.2여야 합니다.
 * 그래서 TypeScript 팀이 안내하는 side-by-side 방식을 씁니다 —
 * `typescript-6` 별칭으로 6.0을 따로 두고, **린터가 볼 때만** 'typescript'를 그쪽으로 돌립니다.
 *
 * 하는 일은 그것뿐입니다. 린트 규칙도 파일 목록도 eslint.config.js가 정합니다.
 * typescript-eslint가 TS 7을 지원하면 이 파일을 지우고 `eslint` 를 직접 부르면 됩니다.
 * 추적: https://github.com/typescript-eslint/typescript-eslint/issues/10940
 */

import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ts6 = pathToFileURL(require.resolve('typescript-6')).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    // 'typescript'와 그 하위 경로만. 나머지는 건드리지 않습니다.
    if (specifier === 'typescript') return { url: ts6, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const { loadESLint } = await import('eslint');
const ESLint = await loadESLint({ useFlatConfig: true });
const eslint = new ESLint({ fix: process.argv.includes('--fix') });

const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const results = await eslint.lintFiles(targets.length ? targets : ['.']);
if (process.argv.includes('--fix')) await ESLint.outputFixes(results);

const formatter = await eslint.loadFormatter('stylish');
const out = await formatter.format(results);
if (out) console.log(out);

const errors = results.reduce((n, r) => n + r.errorCount, 0);
process.exit(errors > 0 ? 1 : 0);
