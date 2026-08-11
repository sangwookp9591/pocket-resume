/* 절차 생성 타일은 결정적이어야 합니다 — 같은 시드면 같은 픽셀.
   눈으로는 확인할 수 없으니 해시로 봅니다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { bakeTilePixels, tileNames, BASE_TILES, EDGE_PAIRS, TILE, mulberry32 } from '../../lib/engine/tilegen.ts';
import { GROUND_TILE } from '../../lib/engine/map.ts';
import { TIMES, TIME_TINTS, tintFor } from '../../lib/engine/palette.ts';
import * as config from '../../lib/engine/config.ts';

test('config가 계약 3절 화면 규격 그대로다', () => {
  assert.equal(config.TILE, 32, '타일 32×32 (HGSS와 같음)');
  assert.equal(config.VIEW_W, 16);
  assert.equal(config.VIEW_H, 11);
  assert.equal(config.WIDTH, 512, '논리 해상도 512×352');
  assert.equal(config.HEIGHT, 352);
  assert.equal(config.CHAR_H, 48, '캐릭터 32×48');
  assert.equal(config.MON_SIZE, 96);
  assert.equal(TILE, config.TILE, 'tilegen이 config를 봐야 합니다');
});

const hash = (d: Uint8ClampedArray) => createHash('sha256').update(Buffer.from(d.buffer, d.byteOffset, d.byteLength)).digest('hex');

test('같은 시드 → 같은 픽셀', () => {
  const a = bakeTilePixels(1234);
  const b = bakeTilePixels(1234);
  assert.equal(hash(a.data), hash(b.data));
});

test('다른 시드 → 다른 픽셀', () => {
  assert.notEqual(hash(bakeTilePixels(1).data), hash(bakeTilePixels(2).data));
});

test('mulberry32는 결정적이고 0..1 범위를 지킨다', () => {
  const a = mulberry32(7);
  const b = mulberry32(7);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('uv 표가 계약 5.A의 타일을 전부 덮는다', () => {
  const { uv } = bakeTilePixels();
  for (const name of BASE_TILES) assert.ok(uv[name], `기본 타일 "${name}"이 uv에 없습니다`);
  // 물 3프레임
  assert.ok(uv['water'] && uv['water-1'] && uv['water-2']);
  // 오토타일 16종 × 3쌍
  for (const [base, other] of EDGE_PAIRS) {
    for (let m = 0; m < 16; m++) assert.ok(uv[`edge:${base}-${other}:${m}`], `edge:${base}-${other}:${m} 누락`);
  }
  assert.equal(Object.keys(uv).length, tileNames().length);
});

test('map.js가 참조하는 타일 이름이 전부 아틀라스에 있다', () => {
  const { uv } = bakeTilePixels();
  for (const name of Object.values(GROUND_TILE)) {
    if (name) assert.ok(uv[name], `맵 범례의 "${name}"이 아틀라스에 없습니다`);
  }
});

test('uv 사각형이 아틀라스 안에 있고 서로 겹치지 않는다', () => {
  const { uv, width, height } = bakeTilePixels();
  const seen = new Set();
  for (const [name, [x, y, w, h]] of Object.entries(uv)) {
    assert.equal(w, TILE);
    assert.equal(h, TILE);
    assert.ok(x >= 0 && y >= 0 && x + w <= width && y + h <= height, `${name}이 아틀라스 밖`);
    const key = `${x},${y}`;
    assert.ok(!seen.has(key), `${name}이 ${key}에서 겹칩니다`);
    seen.add(key);
  }
});

test('모든 픽셀이 불투명하게 칠해졌다 — 빈 구멍 금지', () => {
  const { data, width, uv } = bakeTilePixels();
  for (const [name, [x, y]] of Object.entries(uv)) {
    for (const [dx, dy] of [[0, 0], [TILE - 1, TILE - 1], [TILE >> 1, TILE >> 1]]) {
      const i = ((y + dy) * width + x + dx) * 4;
      assert.equal(data[i + 3], 255, `${name} (${dx},${dy})가 투명합니다`);
    }
  }
});

test('시간대 tint 6종이 다 있고 값 범위를 지킨다', () => {
  assert.equal(TIMES.length, 6);
  for (const t of TIMES) {
    const { rgba, strength } = TIME_TINTS[t];
    assert.equal(rgba.length, 4);
    for (const v of rgba) assert.ok(v >= 0 && v <= 1, `${t}: rgba가 0..1을 벗어남`);
    assert.ok(strength >= 0 && strength <= 1);
  }
  assert.equal(tintFor('없는시간대'), TIME_TINTS.noon, '모르는 시간대는 noon으로 떨어져야 합니다');
});
