/* 에셋 로딩. 계약 8절: "에셋이 하나라도 안 오면 조용히 빈 화면이 되지 않게."

   그래서 못 불러온 것은 **같은 키로 자리표시자를 등록합니다.** 렌더러는 차이를 모르고,
   화면은 비지 않으며, 콘솔에 무엇이 빠졌는지 한 번만 찍힙니다.
   에셋 워커가 파일을 채워 넣으면 이 파일은 한 줄도 안 고쳐도 됩니다. */

import { bakeTileAtlas, tileNames } from '../engine/tilegen.js';
import { TILE, CHAR_W, CHAR_H, MON_SIZE } from '../engine/config.js';
import { PALETTE } from '../engine/palette.js';
import { MONS } from '../../content/mons.js';

const BASE = '/game';

/** 계약 5.D. [id, 가로 타일, 세로 타일] */
export const OBJECTS = [
  ['bld-lab', 4, 3], ['bld-house', 3, 2], ['bld-office-1', 4, 3], ['bld-office-2', 4, 3],
  ['bld-office-3', 4, 3], ['bld-tower', 5, 4], ['bld-cafe', 3, 2], ['bld-gym', 4, 3],
  ['tree', 2, 2], ['tree-small', 1, 1], ['rock', 1, 1], ['bush', 1, 1],
  ['sign', 1, 1], ['fence', 1, 1], ['lamp', 1, 2], ['flower', 1, 1],
  ['mailbox', 1, 1], ['desk', 2, 1], ['shelf', 1, 2], ['campfire', 1, 1],
];

/** 계약 5.B. 이름 → 걷기 2프레임을 가지는가 */
export const CHARS = [
  ['hero', true], ['aing', true], ['prof', false],
  ['npc-senior', false], ['npc-ace', false], ['npc-junior', false],
  ['npc-lead', false], ['npc-nurse', false],
];

/* 실내 구조물. AI에 시키지 않고 항상 코드로 그립니다 —
   벽·창·문·계단은 타일 격자에 딱 맞아야 하는데 AI 생성물은 절대 안 맞습니다. */
export const PROCEDURAL_OBJ = ['wall', 'window', 'counter', 'door', 'stairs'];

const DIRS = ['down', 'up', 'side'];

/** 캐릭터 스프라이트 키. side는 좌우 미러링이므로 left/right 둘 다 side를 씁니다. */
export function charKey(name, dir, frame = 0) {
  const d = dir === 'left' || dir === 'right' ? 'side' : dir;
  return `char/${name}-${d}${frame ? '-2' : ''}`;
}

export const objKey = (id) => `obj/${id}`;
export const monKey = (id) => `mon/${id}`;
export const bgKey = (id) => `bg/${id}`;

/** 모든 에셋 키와 그 규격·소스 경로. 하나의 표가 로딩과 자리표시자를 같이 설명합니다. */
export function manifest() {
  const out = [];
  for (const [name, twoFrame] of CHARS) {
    for (const d of DIRS) {
      out.push({ key: `char/${name}-${d}`, w: CHAR_W, h: CHAR_H, kind: 'char', name, dir: d });
      if (twoFrame) out.push({ key: `char/${name}-${d}-2`, w: CHAR_W, h: CHAR_H, kind: 'char', name, dir: d, f: 1 });
    }
  }
  for (const [id, tw, th] of OBJECTS) {
    out.push({ key: objKey(id), w: tw * TILE, h: th * TILE, kind: 'obj', id });
  }
  for (const id of PROCEDURAL_OBJ) {
    out.push({ key: objKey(id), w: TILE, h: TILE, kind: 'obj', id, always: true });
  }
  for (const m of MONS) out.push({ key: monKey(m.id), w: MON_SIZE, h: MON_SIZE, kind: 'mon', id: m.id });
  /* 배틀 배경(512×192)과 타이틀(512×352)은 여기 없습니다.
     캔버스가 아니라 DOM <img>로 그려서 아틀라스 공간을 먹지 않습니다 —
     처음에 넣었더니 1024px 아틀라스가 터져 로딩이 89%에서 멈췄습니다. */
  return out;
}

/**
 * 렌더러에 전부 등록합니다.
 * @returns {{loaded:number, placeholder:string[], atlasTiles:number}}
 */
export async function loadAssets(renderer, { onProgress } = {}) {
  const tiles = bakeTileAtlas();
  // 절차 타일은 아틀라스 한 장이지만, 렌더러에는 타일마다 따로 넣어야 UV가 맞습니다.
  for (const [name, [x, y, w, h]] of Object.entries(tiles.uv)) {
    renderer.addTexture(`tile/${name}`, cut(tiles.canvas, x, y, w, h));
  }

  const list = manifest();
  const placeholder = [];
  let loaded = 0;
  let done = 0;

  await Promise.all(
    list.map(async (m) => {
      try {
        // always: 파일을 찾지 않습니다. 없는 게 정상입니다.
        const img = m.always ? null : await tryLoad(`${BASE}/${m.key}.webp`);
        if (img) {
          renderer.addTexture(m.key, img);
          loaded++;
        } else {
          renderer.addTexture(m.key, makePlaceholder(m));
          if (!m.always) placeholder.push(m.key);
        }
      } catch (e) {
        // 한 장이 터져도 나머지는 떠야 합니다. 로딩이 멈추면 게임이 통째로 안 뜹니다.
        console.error(`[assets] "${m.key}" 등록 실패:`, e);
        placeholder.push(m.key);
      } finally {
        onProgress?.(++done, list.length);
      }
    }),
  );

  if (placeholder.length) {
    console.info(
      `[assets] ${loaded}/${list.length}장 로드. ${placeholder.length}장은 자리표시자로 그립니다.\n` +
        `  없는 것: ${placeholder.slice(0, 8).join(', ')}${placeholder.length > 8 ? ` 외 ${placeholder.length - 8}장` : ''}`,
    );
  }
  return { loaded, placeholder, atlasTiles: tileNames().length };
}

async function tryLoad(url) {
  try {
    // cache: 'force-cache'를 쓰면 안 됩니다 — 한 번 404가 나면 그 404가 캐시에 남아,
    // 나중에 파일을 채워 넣어도 브라우저가 영영 자리표시자를 그립니다.
    const res = await fetch(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null; // 404도 네트워크 오류도 똑같이 "없음"입니다
  }
}

function cut(src, x, y, w, h) {
  const c = new OffscreenCanvas(w, h);
  c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h);
  return c;
}

/* ── 자리표시자 ──────────────────────────────────────────────────
   "깨진 화면"이 아니라 "아직 안 그린 화면"으로 보이게 그립니다.
   납작한 실루엣이라 진짜 에셋과 헷갈리지 않고, 그래도 무엇인지는 읽힙니다. */

// palette.js는 iceBlue·indigo로 부릅니다. 여기서는 짧은 이름을 쓰므로 한 줄로 맞춰 둡니다.
const P = { ...PALETTE, ice: PALETTE.iceBlue, ink: PALETTE.indigo };
const HUES = [P.moss, P.pine, P.bark, P.ice, P.lavender, P.dusk, P.ember, P.blush];
const pick = (s) => HUES[[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % HUES.length];

function makePlaceholder(m) {
  const c = new OffscreenCanvas(m.w, m.h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (m.kind === 'char') drawChar(g, m);
  else if (m.kind === 'obj') drawObj(g, m);
  else if (m.kind === 'mon') drawMon(g, m);
  else drawBg(g, m);
  return c;
}

/** 사람 모양. 늘 화면에 있으니 이것만은 읽히게 그립니다. */
function drawChar(g, { w, h, name, dir, f }) {
  const body = name === 'aing' ? P.cream : pick(name);
  const hair = name === 'aing' ? P.ice : P.ink;
  const cx = w / 2;
  const foot = h;
  const bob = f ? 1 : 0;

  g.fillStyle = 'rgba(0,0,0,0.18)'; // 발밑 그림자 — 이게 있어야 바닥에 붙어 보입니다
  g.beginPath();
  g.ellipse(cx, foot - 3, w * 0.34, 3.5, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = body; // 몸
  g.fillRect(cx - 8, foot - 24 + bob, 16, 20 - bob);
  g.fillStyle = hair; // 머리
  g.fillRect(cx - 9, foot - 40, 18, 17);
  if (dir !== 'up') {
    g.fillStyle = P.cream; // 얼굴
    g.fillRect(cx - 6, foot - 34, 12, 9);
    g.fillStyle = P.ink; // 눈 — 방향이 읽히게
    if (dir === 'down') { g.fillRect(cx - 4, foot - 31, 2, 3); g.fillRect(cx + 2, foot - 31, 2, 3); }
    else g.fillRect(cx + 1, foot - 31, 2, 3);
  }
  g.fillStyle = P.ink; // 다리
  g.fillRect(cx - 6, foot - 5, 4, 5 - bob);
  g.fillRect(cx + 2, foot - 5 + bob, 4, 5 - bob);
}

function drawObj(g, { w, h, id }) {
  const col = pick(id);
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.beginPath();
  g.ellipse(w / 2, h - 3, w * 0.4, 3.5, 0, 0, Math.PI * 2);
  g.fill();

  if (id.startsWith('bld-')) {
    g.fillStyle = P.cream;
    g.fillRect(2, h * 0.38, w - 4, h * 0.62 - 4);
    g.fillStyle = col; // 지붕
    g.beginPath();
    g.moveTo(0, h * 0.4); g.lineTo(w / 2, 2); g.lineTo(w, h * 0.4); g.closePath();
    g.fill();
    g.fillStyle = P.ink; // 문
    g.fillRect(w / 2 - 8, h - 20, 16, 16);
    g.fillStyle = P.ice; // 창
    for (let i = 0; i < Math.max(1, Math.floor(w / 40)); i++) g.fillRect(8 + i * 34, h * 0.5, 12, 10);
    return;
  }
  if (id === 'wall' || id === 'window' || id === 'counter' || id === 'door' || id === 'stairs') {
    return drawInterior(g, w, h, id);
  }
  if (id === 'tree' || id === 'tree-small') {
    g.fillStyle = P.bark;
    g.fillRect(w / 2 - 3, h - 12, 6, 10);
    g.fillStyle = id === 'tree' ? P.pine : P.moss;
    g.beginPath();
    g.ellipse(w / 2, h * 0.42, w * 0.44, h * 0.4, 0, 0, Math.PI * 2);
    g.fill();
    return;
  }
  // 그 밖의 소품 — 둥근 덩어리 하나
  g.fillStyle = col;
  g.beginPath();
  g.roundRect(3, h * 0.25, w - 6, h * 0.7, 4);
  g.fill();
}

/** 기술몬. 배틀에서 크게 나오므로 최소한 실루엣은 다르게 보이게 합니다. */
function drawMon(g, { w, h, id }) {
  const col = pick(id);
  const r = w * 0.3;
  g.fillStyle = 'rgba(0,0,0,0.15)';
  g.beginPath(); g.ellipse(w / 2, h - 8, r, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = col;
  g.beginPath(); g.ellipse(w / 2, h * 0.55, r, r * 1.05, 0, 0, Math.PI * 2); g.fill();
  // 귀 — id마다 각도가 달라 실루엣이 갈립니다
  const a = ([...id].reduce((s, c) => s + c.charCodeAt(0), 0) % 7) * 0.12 + 0.3;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(w / 2 + s * r * 0.5, h * 0.55 - r * 0.7);
    g.lineTo(w / 2 + s * r * (0.5 + a), h * 0.55 - r * 1.7);
    g.lineTo(w / 2 + s * r * 0.95, h * 0.55 - r * 0.5);
    g.closePath(); g.fill();
  }
  g.fillStyle = P.cream;
  g.beginPath(); g.ellipse(w / 2 - r * 0.35, h * 0.5, 5, 6, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(w / 2 + r * 0.35, h * 0.5, 5, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = P.ink;
  g.beginPath(); g.ellipse(w / 2 - r * 0.35, h * 0.51, 2.5, 3.5, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(w / 2 + r * 0.35, h * 0.51, 2.5, 3.5, 0, 0, Math.PI * 2); g.fill();
}

/* 실내 구조물. 타일 격자에 딱 맞는 납작한 그림이라 이대로 최종본입니다. */
function drawInterior(g, w, h, id) {
  if (id === 'wall' || id === 'window') {
    g.fillStyle = mixHex(P.cream, P.ink, 0.55);
    g.fillRect(0, 0, w, h);
    g.fillStyle = mixHex(P.cream, P.ink, 0.42);
    for (let y = 0; y < h; y += 8) {
      for (let x = (y / 8) % 2 ? -8 : 0; x < w; x += 16) g.fillRect(x + 1, y + 1, 14, 6);
    }
    if (id === 'window') {
      g.fillStyle = P.ice;
      g.fillRect(5, 7, w - 10, h - 16);
      g.fillStyle = mixHex(P.ice, P.cream, 0.6);
      g.fillRect(5, 7, (w - 10) / 2 - 1, h - 16);
      g.fillStyle = P.ink;
      g.fillRect(w / 2 - 1, 7, 2, h - 16);
      g.strokeStyle = P.ink; g.lineWidth = 2;
      g.strokeRect(5, 7, w - 10, h - 16);
    }
    return;
  }
  if (id === 'door') {
    g.fillStyle = P.bark; g.fillRect(4, 2, w - 8, h - 2);
    g.fillStyle = P.soil ?? P.ink; g.fillRect(6, 4, w - 12, h - 4);
    g.fillStyle = P.dusk; g.fillRect(w - 11, h / 2 - 1, 3, 3);
    return;
  }
  if (id === 'stairs') {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 ? mixHex(P.cream, P.ink, 0.3) : mixHex(P.cream, P.ink, 0.15);
      g.fillRect(0, (h / 4) * i, w, h / 4);
    }
    return;
  }
  g.fillStyle = P.bark; // counter
  g.fillRect(0, h * 0.35, w, h * 0.55);
  g.fillStyle = P.cream;
  g.fillRect(0, h * 0.3, w, 5);
}

/** 팔레트 두 색을 섞습니다. palette.js의 mix는 rgb 배열을 받아서 여기선 hex로 감쌉니다. */
function mixHex(a, b, t) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [ar, ag, ab] = h(a); const [br, bg, bb] = h(b);
  const r = Math.round(ar + (br - ar) * t), gg = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${gg},${bl})`;
}

function drawBg(g, { w, h }) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, P.ice);
  sky.addColorStop(1, P.cream);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = P.moss;
  g.fillRect(0, h * 0.72, w, h * 0.28);
  g.fillStyle = P.pine;
  for (let x = -20; x < w; x += 47) {
    g.beginPath();
    g.moveTo(x, h * 0.74); g.lineTo(x + 24, h * 0.52); g.lineTo(x + 48, h * 0.74);
    g.closePath(); g.fill();
  }
}
