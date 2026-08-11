/* 배틀은 확률이 섞여 있어 손으로 돌려 보면 매번 다르게 나옵니다.
   rng를 고정해서 "이 입력이면 반드시 이 결과"를 박아 둡니다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeUnit, stats, damage, effectiveness, catchChance,
  initBattle, step, grantExp, healParty,
} from '../lib/game/battle.ts';
import type { MonId } from '../content/types.ts';

const fixed = (v: number) => () => v;
const battle = (opts: Record<string, unknown> = {}) =>
  initBattle({
    playerParty: [makeUnit('react', 20)],
    wild: makeUnit('spring', 10),
    ...opts,
  });

test('능력치가 레벨에 따라 오른다', () => {
  const a = stats({ base: { hp: 60, atk: 52, def: 58, spd: 45 } }, 10);
  const b = stats({ base: { hp: 60, atk: 52, def: 58, spd: 45 } }, 50);
  assert.ok(b.maxHp > a.maxHp && b.atk > a.atk);
});

test('상성표가 양방향으로 맞다', () => {
  assert.equal(effectiveness('ARCH', 'QUALITY'), 2);
  assert.equal(effectiveness('QUALITY', 'ARCH'), 0.5);
  assert.equal(effectiveness('FRONT', 'FRONT'), 1); // 표에 없으면 등배
});

test('데미지는 항상 1 이상이고 상성이 반영된다', () => {
  const atk = makeUnit('fsd', 50); // ARCH
  const def = makeUnit('playwright', 50); // QUALITY → 2배
  const { dmg, eff } = damage(atk, def, fixed(0.5));
  assert.equal(eff, 2);
  assert.ok(dmg >= 1);
});

test('HP가 낮을수록 잘 잡힌다', () => {
  const full = makeUnit('spring', 10);
  const hurt = { ...full, hp: 1 };
  assert.ok(catchChance(hurt) > catchChance(full));
  assert.ok(catchChance(full) >= 0.04 && catchChance(hurt) <= 0.95);
});

test('공격하면 상대 HP가 준다', () => {
  const s = step(battle(), { kind: 'move', idx: 0 }, fixed(0.5));
  assert.ok(s.foe.hp < s.foe.maxHp, '상대가 안 맞았다');
  assert.ok(s.log.length > 0);
});

test('볼이 성공하면 caught로 끝난다', () => {
  const s = step(battle(), { kind: 'ball' }, fixed(0)); // rng 0 → 반드시 성공
  assert.equal(s.over, 'caught');
});

test('볼이 실패하면 상대가 반격한다', () => {
  const s = step(battle(), { kind: 'ball' }, fixed(0.999)); // 반드시 실패
  assert.equal(s.over, null);
  assert.ok(s.party[0].hp < s.party[0].maxHp, '반격을 안 맞았다');
});

test('파티가 꽉 차면 볼을 못 쓴다', () => {
  const full = Array.from({ length: 6 }, () => makeUnit('react', 20));
  const s = step(battle({ playerParty: full }), { kind: 'ball' }, fixed(0));
  assert.equal(s.over, null);
  assert.match(s.log.join(' '), /너무 많다/);
});

test('스크립트된 패배는 무엇을 해도 진다', () => {
  let s = battle({ scripted: 'lose', wild: makeUnit('opensearch', 40) });
  for (let i = 0; i < 20 && !s.over; i++) s = step(s, { kind: 'move', idx: 0 }, fixed(0.5));
  assert.equal(s.over, 'lost');
});

test('스크립트된 패배에서도 몇 대는 때린다 — 손도 못 쓰면 사고로 읽힌다', () => {
  const before = makeUnit('opensearch', 40);
  const s = step(battle({ scripted: 'lose', wild: before }), { kind: 'move', idx: 0 }, fixed(0.5));
  assert.ok(s.foe.hp < before.maxHp, '한 대도 못 때렸다');
  assert.ok(s.foe.hp >= 1, '스크립트 배틀에서 상대가 쓰러지면 안 된다');
});

test('스크립트된 패배에서는 볼을 못 던진다', () => {
  const s = step(battle({ scripted: 'lose' }), { kind: 'ball' }, fixed(0));
  assert.equal(s.over, null);
  assert.match(s.log.join(' '), /볼을 쓸 수 없다/);
});

test('마지막 하나가 쓰러지면 lost, 남아 있으면 교체된다', () => {
  const party = [{ ...makeUnit('react', 5), hp: 1 }, makeUnit('spring', 30)];
  const s = step(battle({ playerParty: party, wild: makeUnit('outbox', 60) }), { kind: 'move' }, fixed(0.5));
  assert.equal(s.over, null, '남은 기술이 있는데 졌다');
  assert.equal(s.active, 1, '교체가 안 됐다');
});

test('끝난 배틀은 더 진행되지 않는다', () => {
  const done = { ...battle(), over: 'won' as const };
  assert.equal(step(done, { kind: 'move' }, fixed(0.5)), done);
});

test('경험치가 쌓이면 레벨이 오르고 최대 HP도 오른다', () => {
  let u = makeUnit('react', 5);
  const before = u.maxHp;
  for (let i = 0; i < 10; i++) u = grantExp(u, makeUnit('spring', 20));
  assert.ok(u.level > 5, `레벨이 안 올랐다 (${u.level})`);
  assert.ok(u.maxHp > before);
});

test('회복은 전원을 가득 채운다', () => {
  const party = [{ ...makeUnit('react', 20), hp: 1 }, { ...makeUnit('spring', 20), hp: 0 }];
  for (const u of healParty(party)) assert.equal(u.hp, u.maxHp);
});

test('없는 기술몬으로 유닛을 만들면 던진다 — 조용히 undefined가 되지 않게', () => {
  assert.throws(() => makeUnit('nope' as MonId, 5), /없는 기술몬/);
});
