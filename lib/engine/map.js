/* 계약 4절 — ASCII 맵 파서.
   레이어는 문자 코드 그대로 Uint8Array에 담습니다. 별도 id 표를 만들지 않는 이유는
   맵별 legend가 새 대문자를 얼마든지 정의하기 때문입니다 — 문자가 곧 id입니다.
   조용히 빈 맵이 되는 것이 이 파일이 막아야 할 유일한 사고입니다. */

import { TILE } from './config.js';

/** ground 문자 → tilegen 타일 이름. ' '(비움)은 그리지 않습니다. */
export const GROUND_TILE = {
  '.': 'grass',
  ',': 'grass-dark',
  '-': 'path',
  '%': 'stone',
  '~': 'water',
  s: 'sand',
  f: 'floor',
  c: 'carpet',
  '=': 'bridge',
  ' ': null,
};

/** over 문자 → 오브젝트 에셋 id (계약 4.1 고정 범례). '.'은 없음. */
export const OVER_OBJ = {
  '.': null,
  T: 'tree',
  t: 'tree-small',
  R: 'rock',
  g: 'bush',
  S: 'sign',
  F: 'fence',
  L: 'lamp',
  w: 'flower',
  B: 'shelf',
  P: 'desk',
  M: 'mailbox',
  W: 'wall',
  N: 'window',
  C: 'counter',
  d: 'door',
  K: 'campfire',
  e: 'stairs',
};

/** ground지만 통행 불가. */
export const SOLID_GROUND = new Set(['~', ' ']);

/** 인카운터가 도는 칸. */
export const ENCOUNTER_OVER = new Set(['g']);

const strip = (s) => s.replace(/^\n/, '').replace(/\n+$/, '');

function toRows(src, layer, id) {
  if (typeof src !== 'string') {
    throw new Error(`맵 "${id}": ${layer} 레이어가 문자열이 아닙니다 (${typeof src})`);
  }
  const rows = strip(src).split('\n');
  if (rows.length === 0 || rows[0].length === 0) {
    throw new Error(`맵 "${id}": ${layer} 레이어가 비어 있습니다`);
  }
  return rows;
}

/**
 * 계약 4절의 맵 정의를 파싱합니다.
 * 행·열이 어긋나면 **던집니다** — 몇 번째 줄이 몇 칸인지 메시지에 넣습니다.
 * @returns {{id,name,time,indoor,w,h,ground:Uint8Array,over:Uint8Array,solid:Uint8Array,
 *            spawn,warps,npcs,encounters,events,legend}}
 */
export function parseMap(def) {
  const id = def?.id ?? '(id 없음)';
  const legend = def?.legend ?? {};

  const g = toRows(def.ground, 'ground', id);
  const o = toRows(def.over, 'over', id);

  if (g.length !== o.length) {
    throw new Error(`맵 "${id}": ground ${g.length}행 vs over ${o.length}행 — 행 수가 다릅니다`);
  }

  const w = g[0].length;
  const h = g.length;
  const bad = [];
  g.forEach((r, y) => {
    if (r.length !== w) bad.push(`ground ${y}행: ${r.length}칸 (기대 ${w}칸) → "${r}"`);
  });
  o.forEach((r, y) => {
    if (r.length !== w) bad.push(`over ${y}행: ${r.length}칸 (기대 ${w}칸) → "${r}"`);
  });
  if (bad.length) throw new Error(`맵 "${id}": 행 길이가 다릅니다\n  ${bad.join('\n  ')}`);

  const ground = new Uint8Array(w * h);
  const over = new Uint8Array(w * h);
  const solid = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const gc = g[y][x];
      const oc = o[y][x];

      if (!(gc in GROUND_TILE)) {
        throw new Error(`맵 "${id}" ground (${x},${y}) ${y}행: 모르는 문자 "${gc}" → "${g[y]}"`);
      }
      if (!(oc in OVER_OBJ) && !legend[oc]) {
        throw new Error(
          `맵 "${id}" over (${x},${y}) ${y}행: 모르는 문자 "${oc}" — 고정 범례에도 legend에도 없습니다 → "${o[y]}"`,
        );
      }

      ground[i] = gc.charCodeAt(0);
      over[i] = oc.charCodeAt(0);

      // 계약 4.1: 대문자 = 충돌, 소문자 = 통과. 예외 없습니다.
      if (SOLID_GROUND.has(gc)) solid[i] = 1;
      else if (oc !== '.' && oc === oc.toUpperCase() && oc !== oc.toLowerCase()) solid[i] = 1;
    }
  }

  // 여러 칸을 차지하는 건물: 좌상단 앵커 한 칸만 찍혀 있으므로 w×h만큼 채웁니다.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const b = legend[o[y][x]];
      if (!b) continue;
      const bw = b.w ?? 1;
      const bh = b.h ?? 1;
      if (x + bw > w || y + bh > h) {
        throw new Error(
          `맵 "${id}": 건물 "${o[y][x]}"(${b.obj}) (${x},${y}) ${bw}×${bh}가 맵(${w}×${h}) 밖으로 넘칩니다`,
        );
      }
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) solid[(y + j) * w + x + i] = 1;
    }
  }

  const npcs = def.npcs ?? [];
  for (const n of npcs) {
    if (n.x < 0 || n.y < 0 || n.x >= w || n.y >= h) {
      throw new Error(`맵 "${id}": NPC "${n.id}"가 (${n.x},${n.y}) — 맵(${w}×${h}) 밖`);
    }
    solid[n.y * w + n.x] = 1; // NPC가 선 칸도 막힙니다
  }

  return {
    id: def.id,
    name: def.name ?? def.id,
    time: def.time ?? 'noon',
    indoor: !!def.indoor,
    w,
    h,
    pw: w * TILE, // 픽셀 크기 — 카메라를 맵 안에 가두는 데 씁니다
    ph: h * TILE,
    ground,
    over,
    solid,
    spawn: def.spawn ?? { x: 0, y: 0, dir: 'down' },
    warps: def.warps ?? [],
    npcs,
    encounters: def.encounters ?? null,
    events: def.events ?? [],
    legend,
  };
}

const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;

/** 맵 밖은 막힌 것으로 봅니다 — 밖으로 걸어 나가지 않게. */
export function isSolid(m, x, y) {
  return !inside(m, x, y) || m.solid[y * m.w + x] === 1;
}

/** (x,y)의 ground 타일 이름. 없으면 null. */
export function tileAt(m, x, y) {
  if (!inside(m, x, y)) return null;
  return GROUND_TILE[String.fromCharCode(m.ground[y * m.w + x])] ?? null;
}

/** (x,y)의 over 오브젝트 id. legend 건물이면 legend의 obj. 없으면 null. */
export function objAt(m, x, y) {
  if (!inside(m, x, y)) return null;
  const ch = String.fromCharCode(m.over[y * m.w + x]);
  if (ch in OVER_OBJ) return OVER_OBJ[ch];
  return m.legend[ch]?.obj ?? null;
}

/** 풀숲인가 — 인카운터 판정용. */
export function isEncounterTile(m, x, y) {
  if (!inside(m, x, y)) return false;
  return ENCOUNTER_OVER.has(String.fromCharCode(m.over[y * m.w + x]));
}
