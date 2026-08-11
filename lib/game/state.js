/* 세이브 데이터와 조건 판정. 순수 모듈입니다 — localStorage 접근은 save/load 두 함수에만 있습니다. */

import { MONS, byId } from '../../content/mons.js';
import { BADGES } from '../../content/journey.js';
import { makeUnit } from './battle.js';

export const SAVE_KEY = 'pocket-resume/save/v1';

export function createState() {
  return {
    name: '',
    starter: null,
    map: 'lab',
    x: 6,
    y: 8,
    dir: 'up',
    party: [], // makeUnit()의 결과
    dex: [], // 잡은 순서대로의 id 목록
    badges: [],
    flags: [], // 배열로 둡니다 — JSON으로 그대로 저장되게
    playtime: 0,
    steps: 0,
    startedAt: null,
  };
}

/* 조건 문자열 하나를 판정합니다.
     has.springboot  → 도감에 있는가
     badge.connect   → 배지가 있는가
     starterChosen   → 그냥 플래그
   앞에 !를 붙이면 부정입니다. */
export function test1(state, cond) {
  if (cond.startsWith('!')) return !test1(state, cond.slice(1));
  if (cond.startsWith('has.')) return state.dex.includes(cond.slice(4));
  if (cond.startsWith('badge.')) return state.badges.includes(cond.slice(6));
  return state.flags.includes(cond);
}

/** 공백으로 나뉜 조건 전부가 참이어야 참. 빈 문자열은 참. */
export function testAll(state, conds) {
  if (!conds) return true;
  return conds.trim().split(/\s+/).filter(Boolean).every((c) => test1(state, c));
}

/* ── 상태 변경. 전부 새 객체를 돌려줍니다 ─────────────────────── */

export function setFlag(state, flag) {
  return state.flags.includes(flag) ? state : { ...state, flags: [...state.flags, flag] };
}

export function addBadge(state, badge) {
  if (!BADGES[badge]) throw new Error(`없는 배지: ${badge}`);
  return state.badges.includes(badge) ? state : { ...state, badges: [...state.badges, badge] };
}

/** 도감 등록 + 파티 편입. 파티가 6마리면 도감에만 올립니다. */
export function addMon(state, id, level = 5) {
  if (!byId[id]) throw new Error(`없는 기술몬: ${id}`);
  const dex = state.dex.includes(id) ? state.dex : [...state.dex, id];
  const party = state.party.length < 6 && !state.party.some((u) => u.id === id)
    ? [...state.party, makeUnit(id, level)]
    : state.party;
  return { ...state, dex, party };
}

export function moveTo(state, map, x, y, dir = state.dir) {
  return { ...state, map, x, y, dir };
}

/* ── 파생 값 ────────────────────────────────────────────────── */

export const dexCount = (s) => s.dex.length;
export const dexTotal = MONS.length;
export const completion = (s) => Math.round((s.dex.length / MONS.length) * 100);

/** 트레이너 카드에 찍히는 값들. */
export function card(state) {
  return {
    name: state.name || '이름 없음',
    badges: state.badges.map((b) => ({ id: b, ...BADGES[b] })),
    dex: `${state.dex.length}/${MONS.length}`,
    completion: completion(state),
    playtime: fmtTime(state.playtime),
    steps: state.steps,
  };
}

export function fmtTime(ms) {
  const t = Math.floor(ms / 1000);
  return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}`;
}

/* ── 저장 ───────────────────────────────────────────────────── */

/** party는 mon 객체를 통째로 들고 있어 그대로 저장하면 커집니다. id와 레벨만 남깁니다. */
export function serialize(state) {
  return JSON.stringify({
    ...state,
    party: state.party.map((u) => ({ id: u.id, level: u.level, hp: u.hp, exp: u.exp ?? 0 })),
  });
}

export function deserialize(json) {
  const raw = typeof json === 'string' ? JSON.parse(json) : json;
  const base = createState();
  const party = (raw.party ?? [])
    .filter((p) => byId[p.id]) // 도감에서 빠진 기술이 세이브에 남아 있어도 죽지 않게
    .map((p) => ({ ...makeUnit(p.id, p.level), hp: p.hp, exp: p.exp ?? 0 }));
  return { ...base, ...raw, party, dex: (raw.dex ?? []).filter((id) => byId[id]) };
}

export function save(state) {
  try {
    globalThis.localStorage?.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    // 시크릿 모드나 용량 초과. 저장이 안 되는 것은 게임을 멈출 이유가 아닙니다.
    return false;
  }
}

export function load() {
  try {
    const raw = globalThis.localStorage?.getItem(SAVE_KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    globalThis.localStorage?.removeItem(SAVE_KEY);
  } catch {
    /* 지울 수 없어도 새 게임은 시작됩니다 */
  }
}
