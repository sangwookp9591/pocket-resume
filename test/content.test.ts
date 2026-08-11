/* 콘텐츠끼리의 참조가 끊기지 않았는지. 게임을 끝까지 돌려 봐야 아는 것들을 여기서 잡습니다.
   특히 "도감에는 있는데 어디서도 못 잡는 기술"은 플레이로는 영영 발견하지 못합니다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../content/maps.ts';
import { SCRIPTS } from '../content/script.ts';
import { MONS, byId, STARTERS, TYPES, EFFECT } from '../content/mons.ts';
import type { BadgeId, Cmd, MonId, TypeId } from '../content/types.ts';
import { JOURNEY, BADGES } from '../content/journey.ts';

const cmds: Cmd[] = Object.values(SCRIPTS).flat();
const deep = (s: Cmd[]): Cmd[] => s.flatMap((c) => (c.choose ? [c, ...c.choose.flatMap((o) => deep(o.then ?? []))] : [c]));
const all: Cmd[] = Object.values(SCRIPTS).flatMap((s) => deep(s));

test('맵이 참조하는 스크립트가 전부 있다', () => {
  const refs = new Set<string>();
  for (const m of Object.values(MAPS)) {
    for (const n of m.npcs ?? []) refs.add(n.script);
    for (const e of m.events ?? []) refs.add(e.script);
  }
  const missing = [...refs].filter((r) => !SCRIPTS[r]);
  assert.deepEqual(missing, [], `없는 스크립트: ${missing.join(', ')}`);
});

test('스크립트가 참조하는 기술몬이 전부 실재한다', () => {
  const bad: string[] = [];
  for (const c of all) {
    for (const id of [c.give, c.dex, c.battle?.mon].filter((v): v is MonId => !!v)) {
      if (!byId[id]) bad.push(id);
    }
  }
  assert.deepEqual(bad, [], `없는 기술몬: ${bad.join(', ')}`);
});

test('스크립트가 참조하는 배지가 전부 실재한다', () => {
  const bad = all.map((c) => c.badge).filter((b): b is BadgeId => !!b).filter((b) => !BADGES[b]);
  assert.deepEqual(bad, [], `없는 배지: ${bad.join(', ')}`);
});

test('도감의 18종을 전부 얻을 수 있다', () => {
  // give(직접 지급) · battle.mon(잡을 수 있음) · 맵 인카운터 표 셋 중 하나에는 나와야 합니다.
  const reachable = new Set<MonId>();
  for (const c of all) {
    if (c.give) reachable.add(c.give);
    if (c.battle?.mon && c.battle.scripted !== 'lose') reachable.add(c.battle.mon);
  }
  for (const m of Object.values(MAPS)) {
    for (const [id] of m.encounters?.table ?? []) reachable.add(id);
  }
  const unreachable = MONS.map((m) => m.id).filter((id) => !reachable.has(id));
  assert.deepEqual(unreachable, [], `어디서도 못 잡는 기술몬: ${unreachable.join(', ')}`);
});

test('인카운터 표의 확률 합이 100이다', () => {
  for (const m of Object.values(MAPS)) {
    if (!m.encounters) continue;
    const sum = m.encounters.table.reduce((a, [, w]) => a + w, 0);
    assert.equal(sum, 100, `${m.id}: 인카운터 가중치 합이 ${sum}`);
  }
});

test('journey의 gets가 전부 실재하고, 회사 번호가 맞다', () => {
  for (const j of JOURNEY) {
    for (const id of j.gets) {
      assert.ok(byId[id], `${j.id}: 없는 기술몬 ${id}`);
      assert.equal(byId[id].where, j.n, `${byId[id].name}: journey는 ${j.n}사, mons는 ${byId[id].where}사`);
    }
    assert.ok(BADGES[j.badge], `${j.id}: 없는 배지 ${j.badge}`);
    assert.ok(MAPS[j.map], `${j.id}: 없는 맵 ${j.map}`);
  }
  // 반대 방향도. mons에만 있고 journey에 안 적힌 것이 없어야 합니다.
  const listed = new Set<MonId>(JOURNEY.flatMap((j) => j.gets));
  const orphan = MONS.map((m) => m.id).filter((id) => !listed.has(id));
  assert.deepEqual(orphan, [], `journey에 안 적힌 기술몬: ${orphan.join(', ')}`);
});

test('기술몬의 타입과 상성표가 닫혀 있다', () => {
  for (const m of MONS) assert.ok(TYPES[m.type], `${m.name}: 없는 타입 ${m.type}`);
  // Object.entries/keys는 키를 string으로 넓힙니다. 그 키가 정말 TypeId인지가 이 테스트의 검사 대상이라
  // 단언으로 통과시키고, 아니면 아래 런타임 assert에서 TYPES[from]이 undefined로 잡힙니다.
  for (const [from, tbl] of Object.entries(EFFECT) as Array<[TypeId, Record<TypeId, number>]>) {
    assert.ok(TYPES[from], `상성표에 없는 타입 ${from}`);
    for (const to of Object.keys(tbl) as TypeId[]) assert.ok(TYPES[to], `상성표 ${from}→${to}: 없는 타입`);
  }
  // 모든 타입이 상성표에 나와야 합니다 — 빠지면 그 타입만 항상 등배가 됩니다.
  for (const t of Object.keys(TYPES) as TypeId[]) assert.ok(EFFECT[t], `${t}: 상성표에 공격 항목이 없음`);
});

test('스타터가 가리키는 기술몬이 실재한다', () => {
  for (const s of STARTERS) assert.ok(byId[s.mon], `스타터 ${s.name}: 없는 기술몬 ${s.mon}`);
});

test('도감 번호가 1부터 빠짐없이 이어진다', () => {
  const nos = MONS.map((m) => m.no).sort((a, b) => a - b);
  assert.deepEqual(nos, Array.from({ length: MONS.length }, (_, i) => i + 1));
});

test('배틀 배경 번호가 1~5 범위다', () => {
  for (const c of all) {
    if (!c.battle) continue;
    assert.ok((c.battle.bg ?? 1) >= 1 && (c.battle.bg ?? 1) <= 5, `배경 번호 ${c.battle.bg}`);
  }
});

test('모든 대사가 비어 있지 않다 (unless 가드는 예외)', () => {
  for (const [name, s] of Object.entries(SCRIPTS)) {
    for (const c of deep(s)) {
      if (c.t === '' && c.unless) continue; // 조건 가드용 빈 줄
      if ('t' in c) assert.ok((c.t ?? '').length > 0, `${name}: 빈 대사`);
    }
  }
});

test('cmds가 실제로 명령 배열이다', () => {
  assert.ok(cmds.length > 100, `명령이 ${cmds.length}개뿐`);
});
