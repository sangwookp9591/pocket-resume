/* 계약 6절 팔레트 + 시간대 tint 프리셋.
   색은 여기서만 정의합니다 — tilegen도 renderer도 이 파일을 봅니다.
   숫자를 두 군데 적으면 반드시 한 쪽만 고칩니다. */

export const PALETTE = {
  iceBlue: '#A8DDF0',
  lavender: '#B8B0E8',
  cream: '#F4F1EA',
  indigo: '#2E2A6B',
  blush: '#F5C6D0',
  moss: '#7FA65C',
  pine: '#3E6B4A',
  bark: '#7A5A42',
  soil: '#5C4433',
  dusk: '#E8A87C',
  ember: '#F2814F',
};

/** '#RRGGBB' → [r, g, b] (0..255) */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** '#RRGGBB' → [r, g, b] (0..1). 셰이더 유니폼용. */
export function rgb01(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex);
  return [r / 255, g / 255, b / 255];
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/** amt > 0 이면 흰쪽으로, < 0 이면 검은쪽으로. [r,g,b] in → [r,g,b] out */
export function shade(c: [number, number, number], amt: number): [number, number, number] {
  const t = amt > 0 ? 255 : 0;
  const k = Math.abs(amt);
  return [
    clamp255(c[0] + (t - c[0]) * k),
    clamp255(c[1] + (t - c[1]) * k),
    clamp255(c[2] + (t - c[2]) * k),
  ];
}

/** 두 색 사이 선형 보간. t=0 → a, t=1 → b */
export function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    clamp255(a[0] + (b[0] - a[0]) * t),
    clamp255(a[1] + (b[1] - a[1]) * t),
    clamp255(a[2] + (b[2] - a[2]) * t),
  ];
}

/* ── 시간대 tint ──────────────────────────────────────────────────
   세 백엔드가 똑같이 계산해야 하는 식 (하나뿐입니다):

     out.rgb = src.rgb * mix(vec3(1), tint.rgb, strength) + tint.rgb * tint.a * strength

   앞 항이 "곱하기"(전체 색조), 뒤 항이 "더하기"(빛 번짐)입니다.
   Canvas2D는 multiply 합성 + lighter 합성으로 같은 식이 정확히 나옵니다.
   rgba는 0..1, strength는 0..1. */

export const TIMES = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night'];

export const TIME_TINTS: Record<string, { rgba: [number, number, number, number]; strength: number }> = {
  // 새벽: 분홍이 도는 옅은 보라. 아직 어둡습니다.
  dawn: { rgba: [0.78, 0.72, 0.95, 0.10], strength: 0.42 },
  // 아침: 거의 손대지 않습니다. 크림 한 겹.
  morning: { rgba: [1.0, 0.98, 0.90, 0.05], strength: 0.18 },
  // 정오: 원본 그대로. tint 없음이 기본값입니다.
  noon: { rgba: [1.0, 1.0, 1.0, 0.0], strength: 0.0 },
  // 오후: 노란 기가 들어옵니다.
  afternoon: { rgba: [1.0, 0.93, 0.76, 0.06], strength: 0.26 },
  // 해질녘: 주황(ember/dusk 계열).
  dusk: { rgba: [0.95, 0.63, 0.42, 0.12], strength: 0.50 },
  // 밤: 인디고로 눌러 어둡게. 더하기는 아주 조금(달빛).
  night: { rgba: [0.34, 0.38, 0.72, 0.05], strength: 0.62 },
};

/** 모르는 시간대는 noon으로 — 조용히 검게 만들지 않습니다. */
export function tintFor(time: string): { rgba: [number, number, number, number]; strength: number } {
  return TIME_TINTS[time] ?? TIME_TINTS.noon;
}

/* tilegen이 쓰는 지면 색. 전부 위 팔레트에서 파생시킵니다. */
export const GROUND_COLORS: Record<string, [number, number, number]> = {
  grass: rgb(PALETTE.moss),
  'grass-dark': rgb(PALETTE.pine),
  path: rgb(PALETTE.bark),
  stone: mix(rgb(PALETTE.cream), rgb(PALETTE.indigo), 0.35),
  sand: mix(rgb(PALETTE.dusk), rgb(PALETTE.cream), 0.45),
  water: rgb(PALETTE.iceBlue),
  floor: mix(rgb(PALETTE.bark), rgb(PALETTE.cream), 0.45),
  carpet: rgb(PALETTE.blush),
  bridge: rgb(PALETTE.soil),
};
