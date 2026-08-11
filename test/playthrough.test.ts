/* 처음부터 끝까지 한 판. 이 테스트가 없으면 "게임을 깰 수 없다"는 사고를
   사람이 30분 플레이해서야 발견합니다.

   러너·배틀·월드·세이브를 전부 진짜로 씁니다 — 목은 rng 하나뿐입니다. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, type Step } from '../lib/game/runner.ts';
import type { BattleSpec, GameState, MonId } from '../content/types.ts';
import { createState, testAll, addMon, save, load, serialize, deserialize } from '../lib/game/state.ts';
import { initBattle, makeUnit, step as bstep } from '../lib/game/battle.ts';
import { createWorld } from '../lib/game/world.ts';
import { SCRIPTS } from '../content/script.ts';
import { MONS, byId } from '../content/mons.ts';
import type { Cmd } from '../content/types.ts';
import { BADGES } from '../content/journey.ts';
import type { BadgeId, MapId } from '../content/types.ts';
import { MAPS, MAP_ORDER } from '../content/maps.ts';

/** 한 판을 진행하는 작은 하네스. Game.jsx가 하는 일과 같은 순서로 돕니다. */
function makeSession() {
  let state: GameState = createState();
  const log: string[] = [];
  const api = { getState: () => state, setState: (s: GameState) => { state = s; } };

  /** 스크립트 하나를 끝까지. 배틀이 나오면 진짜 배틀 모듈로 결판냅니다. */
  function run(name: string, { pick = 0, playerName = '상욱', maxSteps = 400 }: { pick?: number; playerName?: string; maxSteps?: number } = {}): { blocked?: boolean; scene?: string } {
    const cmds = SCRIPTS[name];
    assert.ok(cmds, `없는 스크립트: ${name}`);
    const r = createRunner(cmds, api);
    let s = r.next();
    for (let n = 0; n < maxSteps; n++) {
      switch (s.kind) {
        case 'done':
          return { blocked: r.blocked };
        case 'text':
          log.push(`${s.who ?? ''}: ${s.t}`);
          s = r.next();
          break;
        case 'choose':
          s = r.pick(s, Math.min(pick, s.options.length - 1));
          break;
        case 'input':
          s = r.answer(s.field, playerName);
          break;
        case 'battle':
          fight(s.battle);
          s = r.next();
          break;
        case 'scene':
          return { scene: s.scene };
        default: // banner · fx · wait · warp
          s = r.next();
      }
    }
    throw new Error(`${name}이(가) ${maxSteps}걸음 안에 안 끝난다`);
  }

  /** 실제 배틀 모듈로 싸웁니다. rng를 0으로 고정하면 볼이 반드시 성공합니다. */
  function fight(spec: BattleSpec): void {
    const party = state.party.length ? state.party : [makeUnit('spring', 5)];
    let b = initBattle({
      playerParty: party,
      wild: makeUnit(spec.mon, spec.level ?? 5),
      scripted: spec.scripted ?? null,
      intro: spec.intro ?? '',
      bg: spec.bg ?? 1,
    });
    for (let i = 0; i < 60 && !b.over; i++) {
      b = bstep(b, { kind: spec.scripted === 'lose' ? 'move' : 'ball' }, () => 0);
    }
    assert.ok(b.over, `${spec.mon} 배틀이 60턴 안에 안 끝난다`);
    if (spec.scripted === 'lose') {
      assert.equal(b.over, 'lost', '지도록 짠 배틀인데 안 졌다');
    } else {
      assert.equal(b.over, 'caught', `${spec.mon}을(를) 못 잡았다 (${b.over})`);
      state = addMon(state, spec.mon, spec.level ?? 5);
    }
    state = { ...state, party: b.party };
  }

  return { run, get state() { return state; }, set state(v) { state = v; }, log };
}

test('처음부터 끝까지 한 판이 끝난다', () => {
  const g = makeSession();

  // ── 0. 연구소 ──
  g.run('lab.open');
  assert.equal(g.state.name, '상욱', '이름이 안 들어갔다');
  assert.ok(testAll(g.state, 'canChoose'), '스타터를 고를 수 있는 상태가 안 됐다');
  // 스타터를 고르기 전에는 나갈 수 없어야 합니다.
  assert.equal(g.run('lab.blockExit').blocked, true, '스타터 전인데 안 막았다');
  g.run('lab.balls');
  assert.ok(testAll(g.state, 'starterChosen aingJoined'), '스타터/파트너 플래그가 안 섰다');
  assert.equal(g.state.dex.length, 1, `스타터가 ${g.state.dex.length}개 들어왔다`);

  // ── 1. 뉴비마을 ──
  g.run('newbie.arrive');
  assert.equal(g.run('newbie.gate').blocked, true, '자신감 배지 전인데 남쪽이 열렸다');
  g.run('newbie.senior');
  assert.ok(g.state.dex.includes('spring'), 'Spring을 못 받았다');

  // ── 2. 야근 사무실 ──
  g.run('office.arrive');
  // 셋을 다 하기 전에는 배지가 안 나옵니다.
  g.run('office.leave');
  assert.ok(!g.state.badges.includes('confidence'), '야근을 안 했는데 자신감 배지가 나왔다');
  g.run('office.learn.springboot');
  g.run('office.learn.jpa');
  g.run('office.learn.react');
  g.run('office.leave');
  assert.ok(g.state.badges.includes('confidence'), '자신감 배지가 안 나왔다');
  assert.equal(g.run('newbie.gate').blocked, false, '배지를 받았는데 아직 막힌다');

  // ── 3. 파도항구 — 반드시 진다 ──
  g.run('harbor.arrive');
  g.run('harbor.ace');
  assert.ok(!g.state.badges.includes('humility'), '두 기술을 안 잡았는데 겸손 배지가 나왔다');
  g.state = addMon(addMon(g.state, 'reactnative', 12), 'aws', 12); // 풀숲 인카운터로 잡는 몫
  g.run('harbor.ace');
  assert.ok(g.state.badges.includes('humility'), '겸손 배지가 안 나왔다');

  // ── 4. 공유마을 ──
  g.run('share.arrive');
  g.run('share.campfire');
  assert.ok(g.state.dex.includes('insight'), '인사이트를 못 잡았다');
  g.state = addMon(g.state, 'ainews', 22);
  g.run('share.lead');
  assert.ok(g.state.badges.includes('insight'), '공유 배지가 안 나왔다');
  assert.equal(g.run('share.gate').blocked, false);

  // ── 5-6. ZIVO ──
  g.run('city.arrive');
  assert.equal(g.run('city.gate').blocked, true, '연결 배지 전인데 챔피언 로드가 열렸다');
  g.run('tower.arrive');
  for (const s of [
    'tower.front.nextjs', 'tower.front.vanilla', 'tower.front.playwright',
    'tower.admin.fsd', 'tower.admin.rbac', 'tower.admin.archunit',
    'tower.back.opensearch', 'tower.back.resilience', 'tower.back.outbox',
  ]) g.run(s);
  g.run('tower.lead');
  assert.ok(g.state.badges.includes('connect'), '연결 배지가 안 나왔다');
  assert.equal(g.run('city.gate').blocked, false, '배지를 받았는데 챔피언 로드가 안 열린다');

  // ── 7. 챔피언 로드 ──
  g.run('road.arrive');
  g.run('road.recap');
  const end = g.run('road.finale', { pick: 0 });
  assert.equal(end.scene, 'hall', `엔딩이 안 열렸다 (${JSON.stringify(end)})`);

  // ── 결과 ──
  assert.equal(g.state.badges.length, 4, `배지가 ${g.state.badges.length}개`);
  assert.equal(g.state.dex.length, MONS.length,
    `도감이 ${g.state.dex.length}/${MONS.length} — 못 잡은 것: ${MONS.map((m) => m.id).filter((id) => !g.state.dex.includes(id))}`);
  for (const b of Object.keys(BADGES) as BadgeId[]) assert.ok(g.state.badges.includes(b), `${b} 배지 누락`);
});

test('마지막 문답은 어느 쪽을 골라도 같은 결론에 닿는다 — 그게 주제다', () => {
  for (const pick of [0, 1]) {
    const g = makeSession();
    g.state = { ...createState(), name: '상욱', dex: MONS.map((m) => m.id), badges: Object.keys(BADGES) as BadgeId[] };
    const end = g.run('road.finale', { pick });
    assert.equal(end.scene, 'hall');
    const all = g.log.join('\n');
    assert.match(all, /연결해서 실제 서비스까지 만드는 개발자/,
      `선택지 ${pick}에서 결론이 안 나왔다:\n${all}`);
  }
});

test('모든 맵이 lab에서 걸어서 닿는다 — 도달 불가능한 맵이 없게', () => {
  const seen = new Set<MapId>(['lab']);
  const queue: MapId[] = ['lab'];
  while (queue.length) {
    for (const w of MAPS[queue.shift()!]!.warps ?? []) {
      if (!seen.has(w.to)) { seen.add(w.to); queue.push(w.to); }
    }
  }
  const unreachable = MAP_ORDER.filter((id) => !seen.has(id));
  assert.deepEqual(unreachable, [], `걸어서 못 가는 맵: ${unreachable.join(', ')}`);
});

test('맵마다 스폰 지점에서 워프 지점까지 갈 수 있다', () => {
  // 충돌 격자 위에서 BFS. 문이 벽에 둘러싸여 못 나가는 맵이 없어야 합니다.
  for (const id of MAP_ORDER) {
    const w = createWorld(id, { ...createState(), ...MAPS[id].spawn });
    const m = w.map;
    const seen = new Set();
    const key = (x: number, y: number) => `${x},${y}`;
    const q: Array<[number, number]> = [[MAPS[id].spawn.x, MAPS[id].spawn.y]];
    seen.add(key(q[0]![0], q[0]![1]));
    while (q.length) {
      const [x, y] = q.shift()!;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        if (seen.has(key(nx, ny))) continue;
        if (m.solid[ny * m.w + nx] === 1) continue;
        seen.add(key(nx, ny));
        q.push([nx, ny]);
      }
    }
    for (const wp of m.warps ?? []) {
      assert.ok(seen.has(key(wp.x, wp.y)),
        `${id}: 스폰(${MAPS[id].spawn.x},${MAPS[id].spawn.y})에서 warp(${wp.x},${wp.y})→${wp.to}까지 걸어갈 수 없다`);
    }
    for (const n of m.npcs ?? []) {
      // NPC 자기 칸은 막혀 있으니, 말을 걸려면 이웃 한 칸이라도 닿아야 합니다.
      const near = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => seen.has(key(n.x + dx, n.y + dy)));
      assert.ok(near, `${id}: NPC "${n.id}"(${n.x},${n.y})에게 말을 걸 수 없다`);
    }
    for (const e of m.events ?? []) {
      if (e.type === 'trigger') {
        assert.ok(seen.has(key(e.x, e.y)), `${id}: trigger "${e.script}"(${e.x},${e.y})를 밟을 수 없다`);
      }
      if (e.type === 'interact') {
        const near = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => seen.has(key(e.x + dx, e.y + dy)));
        assert.ok(near, `${id}: interact "${e.script}"(${e.x},${e.y})에 손이 닿지 않는다`);
      }
    }
  }
});

test('세이브를 저장했다 불러와도 같은 상태다', () => {
  const g = makeSession();
  g.run('lab.open');
  g.run('lab.balls');
  const before = g.state;
  const after = deserialize(serialize(before));
  assert.equal(after.name, before.name);
  assert.deepEqual(after.dex, before.dex);
  assert.deepEqual(after.flags, before.flags);
  assert.equal(after.party.length, before.party.length);
  assert.equal(after.party[0].id, before.party[0].id);
  assert.equal(after.party[0].level, before.party[0].level);
  assert.equal(after.party[0].hp, before.party[0].hp);
});

test('도감에서 사라진 기술이 세이브에 남아 있어도 죽지 않는다', () => {
  const broken = JSON.stringify({
    ...createState(), name: 'x',
    dex: ['spring', '없어진기술'],
    party: [{ id: 'spring', level: 5, hp: 20 }, { id: '없어진기술', level: 9, hp: 1 }],
  });
  const s = deserialize(broken);
  assert.deepEqual(s.dex, ['spring']);
  assert.equal(s.party.length, 1);
});

test('localStorage가 없어도 저장이 게임을 멈추지 않는다', () => {
  // 시크릿 모드·용량 초과. node에는 애초에 localStorage가 없습니다.
  assert.equal(save(createState()), false);
  assert.equal(load(), null);
});

test('모든 기술몬이 서사에서 실제로 손에 들어온다', () => {
  // 위 플레이스루가 도감을 다 채웠으므로, 여기서는 각 몬이 어디서 오는지를 명시적으로 확인합니다.
  const fromScript = new Set();
  const walk = (cmds: Cmd[]) => {
    for (const c of cmds) {
      if (c.give) fromScript.add(c.give);
      if (c.dex) fromScript.add(c.dex);
      if (c.battle?.mon && c.battle.scripted !== 'lose') fromScript.add(c.battle.mon);
      if (c.choose) for (const o of c.choose) walk(o.then ?? []);
    }
  };
  for (const cmds of Object.values(SCRIPTS)) walk(cmds);
  const fromEncounter = new Set(Object.values(MAPS).flatMap((m) => (m.encounters?.table ?? []).map(([id]) => id)));
  for (const m of MONS) {
    assert.ok(fromScript.has(m.id) || fromEncounter.has(m.id),
      `${m.name}(${m.id})은(는) 대사로도 풀숲으로도 얻을 수 없다`);
    assert.ok(byId[m.id], `${m.id} 역참조 실패`);
  }
});
