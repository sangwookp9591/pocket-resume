/* 계약 5.A — 지면 타일을 코드로 그려 아틀라스 한 장으로 굽습니다. 크레딧 0.
   AI로 seamless 타일을 만들면 이음매가 반드시 보입니다. 절차 생성이 더 쌉니다.

   픽셀 계산은 캔버스 없이 Uint8ClampedArray에 합니다 — 그래야 node에서 테스트됩니다.
   캔버스로 굽는 것은 마지막 한 줄(putImageData)뿐입니다. */

import { GROUND_COLORS, shade, mix } from './palette.ts';
import { TILE } from './config.ts';

/** 픽셀 하나를 칠하는 함수. (x,y) → [r,g,b] 또는 null(투명) */
type Paint = (x: number, y: number) => [number, number, number] | null;
type Rnd = () => number;

/** 구운 아틀라스. canvas는 node에서 null입니다 — 픽셀만 씁니다. */
export interface BakedTiles {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  uv: Record<string, [number, number, number, number]>;
}

export { TILE };
const COLS = 8; // 아틀라스 가로 타일 수 → 32px 타일이면 256px

/** 시드 PRNG. Math.random() 금지 — 같은 시드면 같은 그림이어야 합니다. */
export function mulberry32(seed: number): Rnd {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 기본 타일 이름 (물은 3프레임). */
export const BASE_TILES: string[] = [
  'grass',
  'grass-dark',
  'path',
  'stone',
  'sand',
  'water',
  'water-1',
  'water-2',
  'floor',
  'carpet',
  'bridge',
];

export const WATER_FRAMES: string[] = ['water', 'water-1', 'water-2'];

/** 오토타일 쌍. base 위에 other가 마스크 방향에서 스며듭니다.
    이게 없으면 맵이 격자무늬로 보입니다. */
export const EDGE_PAIRS: Array<[string, string]> = [
  ['grass', 'path'],
  ['grass', 'sand'],
  ['water', 'sand'], // 물가
];

/** 4비트 이웃 마스크: 1=N 2=E 4=S 8=W */
export const edgeKey = (base: string, other: string, mask: number) => `edge:${base}-${other}:${mask}`;

/** 아틀라스에 들어가는 모든 타일 이름 (순서 = 배치 순서). */
export function tileNames(): string[] {
  const names = [...BASE_TILES];
  for (const [base, other] of EDGE_PAIRS) {
    for (let m = 0; m < 16; m++) names.push(edgeKey(base, other, m));
  }
  return names;
}

/* ── 픽셀 유틸 ─────────────────────────────────────────────────── */

function poke(buf: Uint8ClampedArray, W: number, x: number, y: number, c: [number, number, number] | null, a = 255): void {
  if (!c) return; // null은 투명 — 그냥 안 칠합니다
  const i = (y * W + x) * 4;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
  buf[i + 3] = a;
}

/** 타일 한 칸을 (ox,oy)에 그립니다. paint(x,y) → [r,g,b] (타일 로컬 좌표) */
function stamp(buf: Uint8ClampedArray, W: number, ox: number, oy: number, paint: Paint): void {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) poke(buf, W, ox + x, oy + y, paint(x, y));
  }
}

/* ── 타일별 페인터 ──────────────────────────────────────────────
   전부 (rnd로 미리 만든 노이즈 표) → (x,y) → 색 순수 함수입니다.
   노이즈를 표로 뽑아 두면 페인터가 호출 순서에 안 흔들립니다. */

function noiseField(rnd: Rnd) {
  const n = new Float32Array(TILE * TILE);
  for (let i = 0; i < n.length; i++) n[i] = rnd();
  return n;
}

function makeBase(name: string, rnd: Rnd): Paint {
  const c = (GROUND_COLORS[name.replace(/-\d$/, '')] ?? GROUND_COLORS.grass)!;
  const n = noiseField(rnd);
  const at = (x: number, y: number) => n[y * TILE + x]!;

  switch (name) {
    case 'grass':
    case 'grass-dark': {
      const lo = shade(c, -0.18);
      const hi = shade(c, 0.14);
      // 잔디 날: 세로 2px 획을 드문드문. 격자 티가 나지 않게 위치는 노이즈로.
      return (x, y) => {
        const v = at(x, y);
        if (v > 0.93 && y > 1) return hi;
        if (v < 0.10) return lo;
        return mix(c, v > 0.5 ? hi : lo, (v - 0.5) * 0.25 + 0.12);
      };
    }
    case 'path': {
      const lo = shade(c, -0.2);
      const hi = mix(c, GROUND_COLORS.sand, 0.4);
      return (x, y) => {
        const v = at(x, y);
        if (v > 0.965) return shade(hi, 0.15); // 작은 자갈
        if (v < 0.05) return lo;
        return mix(c, hi, v * 0.35);
      };
    }
    case 'stone': {
      const mortar = shade(c, -0.3);
      const hi = shade(c, 0.16);
      // 반 타일짜리 블록 네 장 + 줄마다 어긋난 줄눈.
      const B = TILE >> 1;
      return (x, y) => {
        const row = Math.floor(y / B);
        const sx = (x + row * (B >> 1)) % B;
        if (sx === 0 || y % B === 0) return mortar;
        const v = at(x, y);
        if (sx === 1 || y % B === 1) return hi;
        return mix(c, hi, v * 0.22);
      };
    }
    case 'sand': {
      const lo = shade(c, -0.12);
      return (x, y) => {
        const v = at(x, y);
        if (v > 0.96) return shade(c, 0.2);
        return mix(c, lo, v * 0.3);
      };
    }
    case 'water':
    case 'water-1':
    case 'water-2': {
      const frame = name === 'water' ? 0 : Number(name.slice(-1));
      const deep = mix(c, [40, 70, 130], 0.45);
      const foam = shade(c, 0.55);
      // 사인 두 겹 + 프레임마다 위상 이동 = 흐르는 물결.
      const BAND = TILE >> 2;
      return (x, y) => {
        const p = (frame / 3) * Math.PI * 2;
        const w = Math.sin((x / TILE) * Math.PI * 2 + p) * 1.6 + Math.sin((x / 11 + y / 7) * 2 + p) * 1.2;
        const band = (y + w + TILE) % BAND;
        if (band < 1) return foam;
        if (band < BAND * 0.33) return shade(c, 0.18);
        return mix(deep, c, band / BAND);
      };
    }
    case 'floor': {
      const line = shade(c, -0.35);
      const hi = shade(c, 0.12);
      // 가로 마루널(1/4 타일), 세로 이음매는 널마다 어긋나게.
      const P = TILE >> 2;
      return (x, y) => {
        const plank = Math.floor(y / P);
        if (y % P === 0) return line;
        if ((x + plank * 13) % TILE === 0) return line;
        const v = at(x, y);
        return mix(c, y % P === 1 ? hi : c, 0.5 + v * 0.3);
      };
    }
    case 'carpet': {
      const edge = mix(c, GROUND_COLORS.stone, 0.35);
      const dot = shade(c, -0.18);
      return (x, y) => {
        const b = Math.min(x, y, TILE - 1 - x, TILE - 1 - y);
        if (b < 2) return edge;
        if (b === 2) return shade(edge, 0.2);
        if ((x + y) % (TILE >> 2) === 0) return dot;
        return c;
      };
    }
    case 'bridge': {
      const rail = shade(c, -0.4);
      const plank = shade(c, 0.18);
      // 세로 널 + 위아래 난간.
      const R = Math.max(2, Math.round(TILE * 0.09));
      return (x, y) => {
        if (y < R || y >= TILE - R) return rail;
        if (x % (TILE >> 2) === 0) return shade(c, -0.25);
        const v = at(x, y);
        return mix(c, plank, 0.3 + v * 0.35);
      };
    }
    default:
      return () => c;
  }
}

/** 한 변의 스며드는 깊이(px). 쌍마다 고정이라 이웃 타일과 대략 이어집니다.
    ponytail: 변별 지터를 쌍당 하나로 공유합니다 — 이웃 타일과 1~2px 어긋날 수 있지만
    타일 크기에서는 안 보입니다. 완벽히 맞추려면 (쌍,변) 쌍대칭 지터로 올리세요. */
function jitterSet(rnd: Rnd): Uint8Array[] {
  const lo = Math.max(2, Math.round(TILE * 0.09));
  const hi = Math.round(TILE * 0.35);
  const one = () => {
    const a = new Uint8Array(TILE);
    let v = Math.round(TILE * 0.19);
    for (let i = 0; i < TILE; i++) {
      v += Math.floor(rnd() * 3) - 1;
      a[i] = Math.max(lo, Math.min(hi, v));
    }
    return a;
  };
  return [one(), one(), one(), one()]; // N E S W
}

function makeEdge(base: string, other: string, mask: number, seed: number, jit: Uint8Array[]): Paint {
  // 바탕·스며드는 쪽 모두 기본 타일과 같은 시드 → 엣지 타일이 기본 타일과 이어져 보입니다.
  const basePaint = makeBase(base, mulberry32((seed ^ hashName(base)) >>> 0));
  const otherPaint = makeBase(other, mulberry32((seed ^ hashName(other)) >>> 0));
  const line = shade(GROUND_COLORS[other]!, -0.28);
  const [jN, jE, jS, jW] = jit as [Uint8Array, Uint8Array, Uint8Array, Uint8Array];

  const depth = (x: number, y: number) => {
    // 각 변에서 얼마나 파고들었는지. 0 이하면 안 덮임.
    let d = -99;
    if (mask & 1) d = Math.max(d, jN[x] - y);
    if (mask & 2) d = Math.max(d, jE[y] - (TILE - 1 - x));
    if (mask & 4) d = Math.max(d, jS[x] - (TILE - 1 - y));
    if (mask & 8) d = Math.max(d, jW[y] - x);
    return d;
  };

  return (x, y) => {
    const d = depth(x, y);
    if (d <= 0) return basePaint(x, y);
    if (d <= 1) return line; // 경계 1px 진한 선 — 이게 있어야 읽힙니다
    return otherPaint(x, y);
  };
}

function hashName(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* ── 굽기 ──────────────────────────────────────────────────────── */

/**
 * 캔버스 없이 픽셀만 굽습니다. node에서 해시 비교로 테스트하는 대상.
 * @returns {{width:number,height:number,data:Uint8ClampedArray,uv:Record<string,number[]>}}
 */
export function bakeTilePixels(seed = 20260811): BakedTiles {
  const names = tileNames();
  const rows = Math.ceil(names.length / COLS);
  const width = COLS * TILE;
  const height = rows * TILE;
  const data = new Uint8ClampedArray(width * height * 4);
  const uv: Record<string, [number, number, number, number]> = {};

  const rnd = mulberry32(seed);
  const jitters = new Map(EDGE_PAIRS.map(([b, o]) => [`${b}-${o}`, jitterSet(rnd)]));

  names.forEach((name, i) => {
    const ox = (i % COLS) * TILE;
    const oy = Math.floor(i / COLS) * TILE;
    uv[name] = [ox, oy, TILE, TILE];

    let paint;
    if (name.startsWith('edge:')) {
      const [, pair, m] = name.split(':');
      const [base, other] = pair.split('-');
      paint = makeEdge(base!, other!, Number(m), seed, jitters.get(pair)!);
    } else {
      // 기본 타일은 이름으로 시드를 고정 — 배치 순서를 바꿔도 그림이 안 변합니다.
      paint = makeBase(name, mulberry32((seed ^ hashName(name)) >>> 0));
    }
    stamp(data, width, ox, oy, paint);
  });

  return { width, height, data, uv };
}

function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement | null {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return null; // node — 픽셀만 씁니다
}

/**
 * 계약 5.A의 진입점.
 * @returns {{canvas:any, uv:Record<string,number[]>, width:number, height:number, data:Uint8ClampedArray}}
 */
export function bakeTileAtlas(seed = 20260811): BakedTiles & { canvas: OffscreenCanvas | HTMLCanvasElement | null } {
  const baked = bakeTilePixels(seed);
  const canvas = makeCanvas(baked.width, baked.height);
  if (canvas) {
    // OffscreenCanvas와 HTMLCanvasElement의 getContext 오버로드가 갈려 여기서만 좁힙니다.
    const ctx = (canvas as HTMLCanvasElement).getContext('2d');
    ctx?.putImageData(new ImageData(baked.data as unknown as Uint8ClampedArray<ArrayBuffer>, baked.width, baked.height), 0, 0);
  }
  return { canvas, ...baked };
}
