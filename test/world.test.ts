/* 오버월드. 걷기·충돌·워프·인카운터는 손으로 확인하려면 매번 게임을 처음부터 해야 합니다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, rollEncounter, camera, STEP_MS, type WorldEvent } from '../lib/game/world.ts';
import { createState } from '../lib/game/state.ts';
import type { Dir, MapId, MonId } from '../content/types.ts';

const fixed = (v: number) => () => v;
/** WorldEvent 유니온에서 script만 꺼냅니다 — 매번 narrowing을 쓰면 테스트가 안 읽힙니다. */
const scriptOf = (e: WorldEvent | null | undefined) => (e && e.kind === 'script' ? e.script : undefined);
/** 한 칸 걷기를 끝까지 진행합니다. */
const walk = (w: ReturnType<typeof createWorld>, dir: Dir, run = false) => {
  w.press(dir, run);
  w.press(dir, run); // 첫 입력은 방향 전환일 수 있습니다 (포켓몬과 같음)
  for (let i = 0; i < 30 && w.moving; i++) w.update(STEP_MS / 4);
  return w.pos;
};

test('없는 맵을 열면 던진다', () => {
  assert.throws(() => createWorld('없는맵' as MapId, createState()), /없는 맵/);
});

test('첫 입력은 방향만 바꾸고, 두 번째에 움직인다', () => {
  const w = createWorld('lab', { ...createState(), x: 6, y: 8, dir: 'up' as Dir });
  w.press('left');
  assert.equal(w.pos.dir, 'left');
  assert.equal(w.pos.x, 6, '방향만 바뀌어야 하는데 움직였다');
  w.press('left');
  assert.ok(w.moving);
});

test('벽으로는 못 간다', () => {
  const w = createWorld('lab', { ...createState(), x: 1, y: 1, dir: 'left' as Dir });
  walk(w, 'left'); // x=0은 벽(W)
  assert.equal(w.pos.x, 1);
});

test('물은 ground지만 못 건넌다', () => {
  // (10,11)은 다리(=), (9,11)부터 물(~)입니다.
  const st = { ...createState(), map: 'wave-harbor' as MapId, x: 10, y: 11, dir: 'left' as Dir };
  const w = createWorld('wave-harbor', st);
  walk(w, 'left');
  assert.equal(w.pos.x, 10, '물 위를 걸었다');
});

test('NPC가 선 칸으로는 못 간다', () => {
  const st = { ...createState(), map: 'lab' as MapId, x: 9, y: 4, dir: 'up' as Dir };
  const w = createWorld('lab', st); // prof가 (9,3)
  walk(w, 'up');
  assert.equal(w.pos.y, 4, 'NPC를 통과했다');
});

test('달리면 같은 칸을 더 빨리 간다', () => {
  const mk = () => createWorld('lab', { ...createState(), x: 6, y: 8, dir: 'left' as Dir });
  const a = mk(); a.press('left'); a.press('left');
  const b = mk(); b.press('left', true); b.press('left', true);
  let ta = 0; while (a.moving) { a.update(8); ta += 8; }
  let tb = 0; while (b.moving) { b.update(8); tb += 8; }
  assert.ok(tb < ta, `달리기가 안 빠르다 (걷기 ${ta}ms, 달리기 ${tb}ms)`);
});

test('워프 칸을 밟으면 warp를 낸다', () => {
  const out: WorldEvent[] = [];
  const w = createWorld('lab', { ...createState(), x: 6, y: 9, dir: 'down' as Dir }, { onEvent: (e: WorldEvent) => out.push(e) });
  walk(w, 'down'); // (6,10) = 문
  assert.equal(out[0]?.kind, 'warp');
  assert.equal(out[0]!.kind === 'warp' ? out[0]!.warp.to : null, 'newbie-town');
});

test('goto는 맵을 갈아 끼우고 enter 이벤트를 낸다', () => {
  const w = createWorld('lab', createState());
  const r = w.goto('newbie-town', 11, 4, 'down');
  assert.equal(w.map.id, 'newbie-town');
  assert.equal(scriptOf(r), 'newbie.arrive');
});

test('A버튼이 바라보는 칸의 NPC를 집는다', () => {
  const w = createWorld('lab', { ...createState(), x: 9, y: 4, dir: 'up' as Dir });
  assert.equal(scriptOf(w.interact()), 'lab.prof');
});

test('A버튼이 바라보는 칸의 interact 이벤트를 집는다', () => {
  const w = createWorld('lab', { ...createState(), x: 6, y: 4, dir: 'up' as Dir });
  assert.equal(scriptOf(w.interact()), 'lab.balls'); // (6,3) = 책상
});

test('아무것도 없으면 A버튼은 null', () => {
  const w = createWorld('lab', { ...createState(), x: 6, y: 6, dir: 'down' as Dir });
  assert.equal(w.interact(), null);
});

test('맵 이벤트의 unless는 "아직 아니라면 발동"이다', () => {
  const before = createWorld('lab', { ...createState(), x: 6, y: 8, dir: 'down' as Dir }, {});
  before.press('down'); before.press('down');
  for (let i = 0; i < 30 && before.moving; i++) before.update(40);
  assert.equal(scriptOf(before.takePending()), 'lab.blockExit', '스타터 전인데 안 막았다');

  const after = createWorld('lab', { ...createState(), x: 6, y: 8, dir: 'down', flags: ['starterChosen'] });
  after.press('down'); after.press('down');
  for (let i = 0; i < 30 && after.moving; i++) after.update(40);
  assert.equal(after.takePending(), null, '스타터를 골랐는데도 막았다');
});

test('풀숲에서 인카운터가 나오고, 연속으로는 안 나온다', () => {
  const st = { ...createState(), map: 'newbie-town' as MapId, x: 3, y: 12, dir: 'down' as Dir };
  const w = createWorld('newbie-town', st, { rng: fixed(0) }); // 항상 성공하는 rng
  walk(w, 'down'); // (3,13) 풀숲 — 아직 3칸을 안 걸었으므로 안 나옴
  assert.equal(w.takePending(), null, '첫 칸부터 인카운터가 났다');
  walk(w, 'down');
  walk(w, 'down');
  const e = w.takePending();
  assert.equal(e?.kind, 'encounter');
  assert.equal(e.mon, 'spring');
});

test('인카운터 확률이 0이면 절대 안 나온다', () => {
  const st = { ...createState(), map: 'newbie-town' as MapId, x: 3, y: 10, dir: 'down' as Dir };
  const w = createWorld('newbie-town', st, { rng: fixed(0.999) });
  for (let i = 0; i < 5; i++) { walk(w, 'down'); assert.equal(w.takePending(), null); }
});

test('가중치 표에서 뽑는다', () => {
  const t: Array<[MonId, number]> = [['a' as MonId, 60], ['b' as MonId, 40]];
  assert.equal(rollEncounter(t, fixed(0)), 'a');
  assert.equal(rollEncounter(t, fixed(0.99)), 'b');
});

test('카메라가 큰 맵에서는 가장자리를 넘지 않는다', () => {
  const w = createWorld('zivo-city', { ...createState(), x: 0, y: 0, dir: 'down' as Dir });
  const c = camera(w.view(), 16, 11);
  assert.ok(c.x >= 0 && c.y >= 0, `카메라가 음수 (${c.x},${c.y})`);
  const far = createWorld('zivo-city', { ...createState(), x: 25, y: 19, dir: 'down' as Dir });
  const c2 = camera(far.view(), 16, 11);
  assert.ok(c2.x <= 26 - 16 && c2.y <= 20 - 11, `카메라가 맵 밖 (${c2.x},${c2.y})`);
});

test('뷰보다 작은 실내 맵은 가운데 정렬된다 — 한쪽으로 쏠리지 않게', () => {
  const w = createWorld('lab', { ...createState(), x: 0, y: 0, dir: 'down' as Dir });
  const c = camera(w.view(), 16, 11);
  assert.equal(c.x, (14 - 16) / 2, '가로가 안 맞음');
  assert.equal(c.y, 0, '11×11이라 세로는 딱 맞아야 함');
});

test('파트너가 한 칸 뒤를 따라온다', () => {
  const w = createWorld('night-office', { ...createState(), x: 7, y: 8, dir: 'up' as Dir });
  const start = w.view().follower;
  walk(w, 'up');
  walk(w, 'up');
  const v = w.view();
  assert.notDeepEqual({ x: v.follower.x, y: v.follower.y }, { x: v.player.x, y: v.player.y },
    '파트너가 플레이어와 같은 칸에 겹쳤다');
  assert.ok(v.follower.y > v.player.y, '파트너가 앞질렀다');
  assert.ok(start);
});

test('걷는 동안 view의 좌표가 소수로 보간된다', () => {
  const w = createWorld('night-office', { ...createState(), x: 7, y: 8, dir: 'up' as Dir });
  w.press('up'); w.press('up');
  w.update(STEP_MS / 2);
  const y = w.view().player.y;
  assert.ok(y > 7 && y < 8, `보간이 안 된다 (${y})`);
});
