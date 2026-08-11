/* 계약 3절 화면 규격. 숫자는 여기 한 곳에만 있습니다.
   tilegen·renderer·map이 전부 이 파일을 봅니다 — TILE이 모듈마다 박혀 있으면
   나중에 못 바꿉니다. */

/** 타일 한 변(px). HGSS와 같은 32. 절차 타일이 32px 네이티브로 그려집니다. */
export const TILE = 32;

/** 화면에 보이는 타일 수 (16×11). DS(256×192)보다 넓게. */
export const VIEW_W = 16;
export const VIEW_H = 11;

/** 논리 해상도 512×352. 확대는 정수배만, image-rendering: pixelated. */
export const WIDTH = VIEW_W * TILE;
export const HEIGHT = VIEW_H * TILE;

/** 캐릭터 32×48 — 발끝이 타일 하단, 위로 16px 넘침. */
export const CHAR_W = TILE;
export const CHAR_H = 48;

/** 기술몬 96×96 (배틀 전용). */
export const MON_SIZE = 96;

/** 이동 속도(ms/타일). 달리기는 RUN_MS. */
export const WALK_MS = 160;
export const RUN_MS = 96;
