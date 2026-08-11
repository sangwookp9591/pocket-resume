/* parseMap — 조용히 빈 맵이 되지 않는 것이 이 파서의 유일한 책임입니다.
   그래서 "던지는지"를 제일 많이 봅니다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, isSolid, tileAt, objAt, isEncounterTile } from '../../lib/engine/map.ts';
import { MAPS, MAP_ORDER } from '../../content/maps.ts';

const tiny = (over) => ({
  id: 'tiny',
  ground: `
....
.~..
....`,
  over:
    over ??
    `
TT..
..g.
..d.`,
  legend: {},
});

test('정상 맵을 파싱한다', () => {
  const m = parseMap(tiny());
  assert.equal(m.w, 4);
  assert.equal(m.h, 3);
  assert.equal(m.ground.length, 12);
  assert.equal(tileAt(m, 0, 0), 'grass');
  assert.equal(tileAt(m, 1, 1), 'water');
  assert.equal(objAt(m, 0, 0), 'tree');
  assert.equal(objAt(m, 2, 1), 'bush');
  assert.equal(objAt(m, 2, 2), 'door');
  assert.equal(objAt(m, 3, 0), null);
});

test('대문자는 충돌, 소문자는 통과', () => {
  const m = parseMap(tiny());
  assert.ok(isSolid(m, 0, 0), 'T는 막혀야 합니다');
  assert.ok(!isSolid(m, 2, 1), 'g(풀숲)는 통과해야 합니다');
  assert.ok(!isSolid(m, 2, 2), 'd(문)는 통과해야 합니다');
  assert.ok(isSolid(m, 1, 1), '물은 ground지만 통행 불가');
  assert.ok(isSolid(m, -1, 0), '맵 밖은 막힌 것으로 봅니다');
  assert.ok(isSolid(m, 4, 0));
});

test('풀숲만 인카운터 칸이다', () => {
  const m = parseMap(tiny());
  assert.ok(isEncounterTile(m, 2, 1));
  assert.ok(!isEncounterTile(m, 3, 1));
});

test('행 수가 다르면 던지고, 몇 행인지 말한다', () => {
  const def = { id: 'bad', ground: '\n....\n....', over: '\n....', legend: {} };
  assert.throws(() => parseMap(def), /ground 2행 vs over 1행/);
});

test('열 수가 다르면 던지고, 몇 번째 줄이 몇 칸인지 말한다', () => {
  const def = { id: 'bad', ground: '\n....\n...', over: '\n....\n....', legend: {} };
  assert.throws(() => parseMap(def), (e) => {
    assert.match(e.message, /ground 1행: 3칸 \(기대 4칸\)/);
    return true;
  });
});

test('범례에 없는 문자는 던진다 — 조용히 빈 칸이 되지 않게', () => {
  assert.throws(() => parseMap({ id: 'bad', ground: '\n..\n..', over: '\n.Ω\n..', legend: {} }), /모르는 문자 "Ω"/);
  assert.throws(() => parseMap({ id: 'bad', ground: '\n.!\n..', over: '\n..\n..', legend: {} }), /모르는 문자 "!"/);
});

test('legend 건물은 좌상단 기준으로 w×h만큼 충돌을 채운다', () => {
  const m = parseMap({
    id: 'bld',
    ground: `
......
......
......`,
    over: `
.H....
......
......`,
    legend: { H: { obj: 'bld-house', w: 3, h: 2 } },
  });
  for (let y = 0; y < 2; y++) for (let x = 1; x < 4; x++) assert.ok(isSolid(m, x, y), `(${x},${y})가 막혀야 합니다`);
  assert.ok(!isSolid(m, 4, 0), '건물 오른쪽 옆칸은 비어 있어야 합니다');
  assert.ok(!isSolid(m, 1, 2), '건물 아래칸은 비어 있어야 합니다');
  assert.equal(objAt(m, 1, 0), 'bld-house');
});

test('맵 밖으로 넘치는 건물은 던진다', () => {
  const def = {
    id: 'over',
    ground: '\n....\n....',
    over: '\n...H\n....',
    legend: { H: { obj: 'bld-house', w: 3, h: 2 } },
  };
  assert.throws(() => parseMap(def), /밖으로 넘칩니다/);
});

test('NPC가 선 칸도 막힌다', () => {
  const m = parseMap({ ...tiny(), npcs: [{ id: 'x', x: 3, y: 1 }] });
  assert.ok(isSolid(m, 3, 1));
});

test('맵 밖 NPC는 던진다', () => {
  assert.throws(() => parseMap({ ...tiny(), npcs: [{ id: 'x', x: 9, y: 1 }] }), /맵\(4×3\) 밖/);
});

// 실제 콘텐츠 8개가 전부 파싱되는지 — 계약과 데이터가 어긋나면 여기서 터집니다.
for (const id of MAP_ORDER) {
  test(`${id}: 실제 맵이 파싱된다`, () => {
    const m = parseMap(MAPS[id]);
    assert.equal(m.id, id);
    assert.ok(m.w > 0 && m.h > 0);
    assert.ok(!isSolid(m, m.spawn.x, m.spawn.y), `${id}: spawn이 막힌 칸입니다`);
  });
}
