/* 렌더러 자체는 GPU가 있어야 돌지만, 그림을 결정하는 셈은 전부 순수합니다.
   드로우 순서·아틀라스 자리·와이프 마스크가 여기서 틀리면 세 백엔드가 다 틀립니다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPacker, compareInstances, wipeCoverage, WIPE_KINDS, SPIRAL_TURNS } from '../../lib/engine/renderer.ts';

test('팩커는 겹치지 않게 자리를 준다', () => {
  const p = createPacker(64, 1);
  const rs = [p.add(32, 32), p.add(31, 32), p.add(32, 16)];
  assert.deepEqual(rs[0], { x: 0, y: 0, w: 32, h: 32 });
  assert.deepEqual(rs[1], { x: 33, y: 0, w: 31, h: 32 });
  assert.equal(rs[2].y, 33, '다음 선반으로 내려가야 합니다');
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  assert.ok(!overlap(rs[0], rs[1]) && !overlap(rs[1], rs[2]) && !overlap(rs[0], rs[2]));
});

test('팩커는 넘치면 null을 준다 — 조용히 0,0에 겹쳐 찍지 않게', () => {
  const p = createPacker(64);
  assert.equal(p.add(100, 10), null);
  p.add(64, 60);
  assert.equal(p.add(64, 60), null);
});

test('정렬은 depth → 발밑 y → 들어온 순서', () => {
  const inst = (seq, depth, dy, dh) => ({ seq, depth, dy, dh });
  const list = [inst(0, 1, 10, 32), inst(1, 0, 200, 32), inst(2, 1, 5, 32), inst(3, 1, 10, 32)];
  const sorted = [...list].sort(compareInstances).map((i) => i.seq);
  assert.deepEqual(sorted, [1, 2, 0, 3]);
});

test('발밑 기준이라 키 큰 스프라이트가 아래 것을 가리지 않는다', () => {
  // 32×48 캐릭터(위로 16px 넘침)와 그 아래 타일: dy는 캐릭터가 작지만 발밑은 같습니다.
  const hero = { seq: 0, depth: 1, dy: 100, dh: 48 };
  const bush = { seq: 1, depth: 1, dy: 148, dh: 32 };
  assert.ok(compareInstances(hero, bush) < 0, '아래에 있는 풀숲이 나중에 그려져야 합니다');
});

test('wipe: none과 t=0은 아무것도 덮지 않는다', () => {
  assert.equal(wipeCoverage('none', 1, 0.5, 0.5), 0);
  assert.equal(wipeCoverage('spiral', 0, 0.5, 0.5), 0);
});

test('wipe: t=1이면 어디든 전부 덮인다', () => {
  for (const k of Object.keys(WIPE_KINDS)) {
    if (k === 'none') continue;
    for (const [u, v] of [[0, 0], [1, 1], [0.5, 0.5], [0, 1]]) {
      assert.equal(wipeCoverage(k, 1, u, v), 1, `${k} (${u},${v})`);
    }
  }
});

test('wipe fade는 t를 그대로 쓴다', () => {
  assert.equal(wipeCoverage('fade', 0.3, 0.1, 0.9), 0.3);
});

test('wipe split은 위아래에서 닫힌다', () => {
  assert.equal(wipeCoverage('split', 0.5, 0.5, 0.1), 1, '윗변은 덮임');
  assert.equal(wipeCoverage('split', 0.5, 0.5, 0.9), 1, '아랫변은 덮임');
  assert.equal(wipeCoverage('split', 0.5, 0.5, 0.5), 0, '가운데는 아직');
});

test('wipe spiral은 가운데부터 단조 증가로 덮인다', () => {
  const center = [0.5, 0.5];
  assert.equal(wipeCoverage('spiral', 0.5, ...center), 1, '가운데는 절반쯤에 이미 덮임');
  // 같은 점에서 t가 커질 때 한 번 덮이면 다시 벗겨지지 않아야 합니다.
  for (const [u, v] of [[0.2, 0.3], [0.9, 0.1], [0.5, 0.8]]) {
    let covered = false;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const c = wipeCoverage('spiral', t, u, v);
      if (covered) assert.equal(c, 1, `(${u},${v}) t=${t.toFixed(2)}에서 다시 벗겨졌습니다`);
      if (c === 1) covered = true;
    }
    assert.ok(covered, `(${u},${v})가 t=1까지 덮이지 않았습니다`);
  }
});

test('spiral은 각도에 따라 덮이는 시점이 달라진다 — 그래서 소용돌이', () => {
  const r = 0.25; // 중심에서 같은 거리, 각도만 다른 두 점
  const p = (deg) => [0.5 + r * Math.cos((deg * Math.PI) / 180), 0.5 + r * Math.sin((deg * Math.PI) / 180)];
  const first = (uv) => {
    for (let t = 0; t <= 1; t += 0.005) if (wipeCoverage('spiral', t, ...uv)) return t;
    return 1;
  };
  assert.ok(Math.abs(first(p(180)) - first(p(0))) > 0.05, '각도에 따른 시차가 없으면 그냥 원입니다');
  assert.ok(SPIRAL_TURNS > 0);
});
