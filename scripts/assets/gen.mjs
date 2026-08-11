#!/usr/bin/env node
/* 에셋 생성기. manifest.js를 읽어 없는 것만 만듭니다.

     node scripts/assets/gen.mjs                 # 없는 것 전부
     node scripts/assets/gen.mjs --force mon/react char/hero-down
     node scripts/assets/gen.mjs --only obj/      # 접두사로 걸러서
     node scripts/assets/gen.mjs --jobs 1 --dry

   재실행 가능합니다. 이미 있는 결과물은 건드리지 않으므로 중간에 죽어도
   다시 돌리면 남은 것만 만듭니다. 크레딧이 걸린 스크립트라 이게 제일 중요합니다. */

import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { ASSETS, PRICE, byId } from './manifest.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const RAW = join(HERE, 'raw');
const LOG = join(HERE, 'log.json');

/* 계약 7절. 이 스크립트가 태울 수 있는 전부입니다. */
const CAP = 300;
const STOP = 280; // 여기 닿으면 남은 것을 시작하지 않습니다
const TRIES = 3;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const list = (n) => {
  const i = argv.indexOf(n);
  if (i < 0) return [];
  const out = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) out.push(argv[j]);
  return out;
};
const num = (n, d) => (argv.includes(n) ? Number(argv[argv.indexOf(n) + 1]) : d);

const force = new Set(list('--force'));
const only = list('--only');
const JOBS = num('--jobs', 4);
const DRY = flag('--dry');
/* 원본 PNG가 남아 있으면 다시 생성하지 않고 후처리만 다시 합니다.
   post.py를 고쳤을 때 크레딧 0으로 전부 다시 굽는 길입니다. */
const REPOST = flag('--repost');

let spent = 0;
let halted = false;
const log = new Map();

const money = (m) => PRICE[m] ?? 0;
const line = (s) => process.stdout.write(`${s}\n`);

/** 크레딧을 태우기 직전에 부릅니다. 상한을 넘길 것 같으면 false. */
function charge(model) {
  const c = money(model);
  if (spent + c > STOP) {
    halted = true;
    return false;
  }
  spent += c;
  const mark = [100, 200, 280].find((m) => spent >= m && spent - c < m);
  if (mark) line(`\n*** 크레딧 ${mark} 통과 — 누적 ${spent.toFixed(1)} / 상한 ${CAP} ***\n`);
  return true;
}

const exists = (p) => stat(p).then((s) => s.size > 0, () => false);

const rawOf = (id) => join(RAW, `${id.replace('/', '_')}.png`);

/** higgsfield는 job 배열을 뱉습니다. 첫 결과의 result_url만 씁니다. */
async function generate(a) {
  const args = ['generate', 'create', a.model, '--prompt', a.prompt,
    '--aspect_ratio', a.ar, '--wait', '--json'];
  if (a.model === 'nano_banana_flash') args.push('--resolution', '1k');
  // refFrom: 다른 에셋의 **원본 PNG**를 참조로 씁니다. 32×48 결과물은 참조로 쓰기엔 너무 작습니다.
  const ref = a.ref ?? (a.refFrom ? rawOf(a.refFrom) : null);
  if (ref) args.push('--image-references', ref);

  const { stdout } = await run('higgsfield', args, { maxBuffer: 64 << 20, timeout: 15 * 60_000 });
  const jobs = JSON.parse(stdout.slice(stdout.indexOf('[')));
  const url = jobs[0]?.result_url;
  if (!url) throw new Error(`result_url 없음 (status=${jobs[0]?.status})`);
  return url;
}

async function download(url, dest) {
  await run('curl', ['-fsSL', url, '-o', dest], { timeout: 120_000 });
  if (!(await exists(dest))) throw new Error('내려받은 파일이 비었습니다');
}

/** post.py. 마지막 줄의 JSON이 품질 게이트 입력입니다. */
async function post(src, out, a, derive = false) {
  const args = [join(HERE, 'post.py'), '--src', src, '--out', out,
    '--w', String(a.w), '--h', String(a.h),
    '--mode', a.transparent ? 'cutout' : 'opaque',
    '--align', a.align ?? 'bottom',
    '--stretch', String(a.stretch ?? 1)];
  if (derive) args.push('--derive');
  const { stdout } = await run('python3', args, { timeout: 120_000 });
  return JSON.parse(stdout.trim().split('\n').pop());
}

/** 스스로 판정하는 최소 게이트. 사람 눈은 따로 봅니다. */
function gate(a, st) {
  if (st.w !== a.w || st.h !== a.h) throw new Error(`규격 불일치 ${st.w}x${st.h}`);
  if (!a.transparent) return;
  if (st.fill < 0.05) throw new Error(`거의 다 투명 (fill=${st.fill}) — 크로마키가 다 먹었습니다`);
  if (st.fill > 0.985) throw new Error(`투명이 없음 (fill=${st.fill}) — 배경이 안 빠졌습니다`);
}

async function makeOne(a) {
  const out = join(ROOT, a.path);
  await mkdir(dirname(out), { recursive: true });

  if (!REPOST && !force.has(a.id) && (await exists(out))) {
    log.set(a.id, { id: a.id, path: a.path, ok: true, attempts: 0, model: '—', note: 'skip(이미 있음)' });
    line(`· ${a.id} — 건너뜀 (이미 있음)`);
    return;
  }

  // 파생 프레임: 크레딧을 쓰지 않고 원본 프레임에서 만듭니다.
  if (a.from) {
    const src = join(ROOT, byId(a.from).path);
    if (!(await exists(src))) throw new Error(`원본 ${a.from}이 아직 없습니다`);
    const st = await post(src, out, a, true);
    gate(a, st);
    const { size } = await stat(out);
    log.set(a.id, { id: a.id, path: a.path, ok: true, attempts: 0, model: 'derive', bytes: size, fill: st.fill });
    line(`✓ ${a.id} — ${a.from}에서 파생 · ${size}B`);
    return;
  }

  const raw = rawOf(a.id);

  // --repost: 원본이 남아 있으면 후처리만 다시. post.py를 고쳤을 때 쓰는 길이라 크레딧 0.
  if (REPOST && (await exists(raw))) {
    const st = await post(raw, out, a);
    gate(a, st);
    const { size } = await stat(out);
    log.set(a.id, { id: a.id, path: a.path, ok: true, attempts: 0, model: 'repost', bytes: size, fill: st.fill });
    line(`✓ ${a.id} — 원본에서 후처리만 · ${size}B`);
    return;
  }

  let err;
  for (let t = 1; t <= TRIES; t++) {
    if (!charge(a.model)) { err = new Error(`크레딧 상한(${STOP}) 도달 — 시작하지 않음`); break; }
    try {
      if (DRY) { line(`… ${a.id} — dry, ${money(a.model)}크레딧 예상`); return; }
      await download(await generate(a), raw);
      const st = await post(raw, out, a);
      gate(a, st);
      const { size } = await stat(out);
      log.set(a.id, { id: a.id, path: a.path, ok: true, attempts: t, model: a.model, bytes: size, fill: st.fill });
      line(`✓ ${a.id} — ${a.w}x${a.h} · ${size}B · 시도 ${t} · 누적 ${spent.toFixed(1)}`);
      return;
    } catch (e) {
      err = e;
      line(`✗ ${a.id} — 시도 ${t}/${TRIES} 실패: ${String(e.message).slice(0, 160)}`);
    }
  }
  log.set(a.id, { id: a.id, path: a.path, ok: false, attempts: TRIES, model: a.model, error: String(err?.message).slice(0, 300) });
}

/** 3단계로 나눕니다: 혼자 서는 것 → 다른 원본을 참조하는 것 → 파생. 뒤가 앞을 기다립니다. */
const PASS = [
  (a) => !a.from && !a.refFrom,
  (a) => !a.from && a.refFrom,
  (a) => a.from,
];

async function pool(items, n, fn) {
  const q = [...items];
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => {
    while (q.length) {
      if (halted) return;
      const a = q.shift();
      try { await fn(a); } catch (e) {
        log.set(a.id, { id: a.id, path: a.path, ok: false, attempts: 0, error: String(e.message).slice(0, 300) });
        line(`✗ ${a.id} — ${e.message}`);
      }
    }
  }));
}

const picked = ASSETS.filter((a) => (only.length ? only.some((p) => a.id.startsWith(p)) : true));
const passes = PASS.map((f) => picked.filter(f));

line(`대상 ${picked.length}장 (${passes.map((p) => p.length).join(' → ')}) · 동시 ${JOBS} · 상한 ${CAP}\n`);
await mkdir(RAW, { recursive: true });

for (const p of passes) await pool(p, JOBS, makeOne);

const prev = await readFile(LOG, 'utf8').then(JSON.parse, () => ({ rows: [], spent: 0 }));
const rows = [...prev.rows.filter((r) => !log.has(r.id)), ...log.values()];
await writeFile(LOG, `${JSON.stringify({ spent: prev.spent + spent, rows }, null, 2)}\n`);

const bad = rows.filter((r) => !r.ok);
line(`\n끝. 이번 실행 ${spent.toFixed(1)}크레딧 · 성공 ${rows.length - bad.length}/${rows.length}` +
  (bad.length ? `\n실패: ${bad.map((b) => b.id).join(', ')}` : ''));
if (halted) line('!!! 크레딧 상한에 걸려 중단했습니다 — 남은 것은 만들지 않았습니다.');
