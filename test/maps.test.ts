/* 맵 ASCII의 행 길이·warp·이벤트 좌표를 검사합니다.
   눈으로 세면 반드시 틀립니다 — 24칸짜리 줄에서 한 칸 모자란 것은 안 보입니다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, MAP_ORDER } from '../content/maps.ts';
import type { MapDef } from '../content/types.ts';

const rows = (s: string) => s.replace(/^\n/, '').replace(/\n$/, '').split('\n');

// 고정 범례(계약 4.1). 여기 없는 대문자는 맵별 legend에 있어야 합니다.
const GROUND = new Set(['.', ',', '-', '%', '~', 's', 'f', 'c', '=', ' ']);
const OVER = new Set(['.', 'T', 't', 'R', 'g', 'S', 'F', 'L', 'w', 'B', 'P', 'M', 'W', 'N', 'C', 'd', 'K', 'e']);
const SOLID_GROUND = new Set(['~', ' ']); // 물과 비움은 ground지만 통행 불가

for (const id of MAP_ORDER) {
  const m = MAPS[id];

  test(`${id}: 두 레이어의 행·열 수가 같다`, () => {
    const g = rows(m.ground);
    const o = rows(m.over);
    assert.equal(g.length, o.length, `${id}: ground ${g.length}행 vs over ${o.length}행`);

    const w = g[0]!.length;
    g.forEach((r, y) => assert.equal(r.length, w, `${id} ground ${y}행: ${r.length}칸 (기대 ${w}) → "${r}"`));
    o.forEach((r, y) => assert.equal(r.length, w, `${id} over ${y}행: ${r.length}칸 (기대 ${w}) → "${r}"`));
  });

  test(`${id}: 범례에 없는 문자가 없다`, () => {
    for (const [y, r] of rows(m.ground).entries()) {
      for (const [x, ch] of [...r].entries()) {
        assert.ok(GROUND.has(ch), `${id} ground (${x},${y}): 모르는 문자 "${ch}"`);
      }
    }
    for (const [y, r] of rows(m.over).entries()) {
      for (const [x, ch] of [...r].entries()) {
        assert.ok(OVER.has(ch) || m.legend[ch], `${id} over (${x},${y}): 모르는 문자 "${ch}"`);
      }
    }
  });

  test(`${id}: spawn·warp·NPC가 벽에 박혀 있지 않다`, () => {
    const g = rows(m.ground);
    const o = rows(m.over);
    const w = g[0]!.length;
    const h = g.length;

    // 건물이 차지하는 칸을 미리 채웁니다 — 좌상단 앵커 한 칸만 찍혀 있으므로.
    const solid = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => {
        const ch = o[y]![x]!;
        if (SOLID_GROUND.has(g[y]![x]!)) return true;
        if (ch === '.' || ch === ch.toLowerCase()) return false;
        return true;
      }),
    );
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const b = m.legend[o[y]![x]!];
        if (!b) continue;
        for (let j = 0; j < b.h; j++)
          for (let i = 0; i < b.w; i++)
            if (y + j < h && x + i < w) solid[y + j]![x + i] = true;
      }
    }

    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
    const free = (x: number, y: number, what: string) => {
      assert.ok(inside(x, y), `${id} ${what}: (${x},${y})가 맵(${w}×${h}) 밖`);
      assert.ok(!solid[y]![x], `${id} ${what}: (${x},${y})가 막힌 칸 — over "${o[y]![x]}" ground "${g[y]![x]}"`);
    };

    free(m.spawn.x, m.spawn.y, 'spawn');
    for (const wp of m.warps ?? []) free(wp.x, wp.y, `warp→${wp.to}`);
    // NPC는 자기 칸을 막고 서 있는 게 정상이지만, 벽 속에 있으면 안 됩니다.
    for (const n of m.npcs ?? []) free(n.x, n.y, `npc ${n.id}`);
    // trigger는 밟는 것이므로 반드시 걸을 수 있어야 합니다.
    for (const e of m.events ?? []) {
      if (e.type === 'trigger') free(e.x!, e.y!, `trigger ${e.script}`);
    }
  });

  test(`${id}: warp의 목적지가 실재하고 그 칸이 비어 있다`, () => {
    for (const wp of m.warps ?? []) {
      const dst = MAPS[wp.to];
      assert.ok(dst, `${id}: warp 목적지 "${wp.to}"가 없음`);
      const dg = rows(dst.ground);
      assert.ok(
        wp.ty < dg.length && wp.tx < dg[0]!.length,
        `${id}→${wp.to}: 도착 좌표 (${wp.tx},${wp.ty})가 목적지(${dg[0]!.length}×${dg.length}) 밖`,
      );
    }
  });
}

test('모든 맵이 MAP_ORDER에 있다', () => {
  assert.deepEqual(Object.keys(MAPS).sort(), [...MAP_ORDER].sort());
});
