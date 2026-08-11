/* 턴제 배틀. 순수 함수 리듀서라 테스트가 됩니다 — React도 캔버스도 모릅니다.
   포켓몬의 공식을 그대로 쓰지 않고 읽히는 만큼만 단순화했습니다. */

import { byId, EFFECT } from '../../content/mons.js';

export const MAX_PARTY = 6;

/** 레벨에 따른 실제 능력치. 포켓몬의 개체값·노력치는 없습니다 — 그럴 이유가 없습니다. */
export function stats(mon, level) {
  const b = mon.base;
  return {
    maxHp: Math.floor((b.hp * 2 * level) / 100) + level + 10,
    atk: Math.floor((b.atk * 2 * level) / 100) + 5,
    def: Math.floor((b.def * 2 * level) / 100) + 5,
    spd: Math.floor((b.spd * 2 * level) / 100) + 5,
  };
}

export function makeUnit(monId, level) {
  const mon = byId[monId];
  if (!mon) throw new Error(`없는 기술몬: ${monId}`);
  const s = stats(mon, level);
  return { id: monId, mon, level, ...s, hp: s.maxHp, moveIdx: 0 };
}

/** 상성 배율. 표에 없으면 1배. */
export function effectiveness(atkType, defType) {
  return EFFECT[atkType]?.[defType] ?? 1;
}

/** 데미지. rng는 0~1을 돌려주는 함수 — 테스트에서 고정합니다. */
export function damage(attacker, defender, rng) {
  const eff = effectiveness(attacker.mon.type, defender.mon.type);
  const stab = 1.5; // 자기 타입 기술만 있으므로 항상 붙습니다
  const base = ((2 * attacker.level) / 5 + 2) * 40 * (attacker.atk / defender.def);
  const roll = 0.85 + rng() * 0.15;
  const dmg = Math.max(1, Math.floor((base / 50 + 2) * stab * eff * roll));
  return { dmg, eff };
}

/** 포획 확률. HP를 깎을수록, catchRate가 높을수록 잘 잡힙니다. */
export function catchChance(target) {
  const hpTerm = (3 * target.maxHp - 2 * target.hp) / (3 * target.maxHp);
  const p = hpTerm * (target.mon.catchRate / 255);
  return Math.min(0.95, Math.max(0.04, p));
}

export function initBattle({ playerParty, wild, scripted = null, intro = '', bg = 1 }) {
  return {
    party: playerParty,
    active: 0,
    foe: wild,
    scripted, // null | 'win' | 'lose'
    turn: 'player',
    over: null, // null | 'caught' | 'won' | 'lost' | 'fled'
    log: intro ? [intro] : [],
    bg,
    ballsThrown: 0,
  };
}

const me = (s) => s.party[s.active];

/** 한 턴을 진행합니다. action: {kind:'move'|'ball'|'run'|'switch', idx?} */
export function step(state, action, rng = Math.random) {
  if (state.over) return state;
  const s = { ...state, log: [...state.log] };

  // 스크립트된 패배는 무엇을 하든 집니다. 이 배틀은 게임플레이가 아니라 서사입니다.
  if (s.scripted === 'lose') return loseScripted(s, action);

  switch (action.kind) {
    case 'move':
      playerMove(s, action.idx ?? me(s).moveIdx, rng);
      break;
    case 'ball':
      if (throwBall(s, rng)) return s;
      break;
    case 'run':
      if (tryRun(s, rng)) return s;
      break;
    case 'switch':
      return doSwitch(s, action.idx);
    default:
      throw new Error(`모르는 행동: ${action.kind}`);
  }

  if (s.foe.hp <= 0) {
    s.log.push(`야생의 ${s.foe.mon.name}(은)는 쓰러졌다!`);
    s.over = 'won';
    return s;
  }
  foeMove(s, rng);
  if (me(s).hp <= 0) {
    s.log.push(`${me(s).mon.name}(은)는 쓰러졌다!`);
    const next = s.party.findIndex((u, i) => i !== s.active && u.hp > 0);
    if (next === -1) s.over = 'lost';
    else s.active = next;
  }
  return s;
}

function playerMove(s, idx, rng) {
  const u = me(s);
  const { dmg, eff } = damage(u, s.foe, rng);
  s.foe = { ...s.foe, hp: Math.max(0, s.foe.hp - dmg) };
  s.log.push(`${u.mon.name}의 ${u.mon.moves[idx % 4]}!`);
  if (eff > 1) s.log.push('효과가 굉장했다!');
  if (eff < 1) s.log.push('효과가 별로인 듯하다…');
}

function foeMove(s, rng) {
  const u = me(s);
  const { dmg, eff } = damage(s.foe, u, rng);
  const nu = { ...u, hp: Math.max(0, u.hp - dmg) };
  s.party = s.party.map((p, i) => (i === s.active ? nu : p));
  s.log.push(`야생의 ${s.foe.mon.name}의 ${s.foe.mon.moves[Math.floor(rng() * 4)]}!`);
  if (eff > 1) s.log.push('효과가 굉장했다!');
}

function throwBall(s, rng) {
  s.ballsThrown++;
  s.log.push('기술볼을 던졌다!');
  if (s.party.length >= MAX_PARTY) {
    s.log.push('…가진 기술이 너무 많다. 하나를 놓아야 한다.');
    return false;
  }
  const p = catchChance(s.foe);
  if (rng() < p) {
    s.log.push(`앗! ${s.foe.mon.name}(을)를 잡았다!`);
    s.over = 'caught';
    return true;
  }
  s.log.push('아깝다! 조금만 더 있으면 잡을 수 있었는데!');
  foeMove(s, rng);
  if (me(s).hp <= 0) {
    const next = s.party.findIndex((u, i) => i !== s.active && u.hp > 0);
    if (next === -1) s.over = 'lost';
    else s.active = next;
  }
  return true;
}

function tryRun(s, rng) {
  const odds = (me(s).spd * 128) / Math.max(1, s.foe.spd) + 30;
  if (rng() * 256 < odds) {
    s.log.push('무사히 도망쳤다!');
    s.over = 'fled';
    return true;
  }
  s.log.push('도망칠 수 없다!');
  foeMove(s, rng);
  return true;
}

function doSwitch(s, idx) {
  if (idx === s.active || !s.party[idx] || s.party[idx].hp <= 0) return s;
  s.log.push(`돌아와, ${me(s).mon.name}! 가라, ${s.party[idx].mon.name}!`);
  return { ...s, active: idx };
}

/* 파도항구의 실력자 전. 이기는 배틀이 아니라 지는 장면이라 게임플레이가 아닙니다.
   그래도 몇 대는 때릴 수 있게 둡니다 — 손도 못 쓰고 지면 서사가 아니라 사고로 읽힙니다. */
function loseScripted(s, action) {
  if (action.kind === 'run') {
    s.log.push('도망칠 수 없다!');
  } else if (action.kind === 'ball') {
    s.log.push('트레이너의 기술에는 볼을 쓸 수 없다!');
    return s;
  } else {
    const u = me(s);
    s.foe = { ...s.foe, hp: Math.max(1, s.foe.hp - Math.floor(s.foe.maxHp * 0.06)) };
    s.log.push(`${u.mon.name}의 ${u.mon.moves[0]}!`);
    s.log.push('…거의 통하지 않았다.');
  }
  const u = me(s);
  const nu = { ...u, hp: Math.max(0, u.hp - Math.ceil(u.maxHp * 0.34)) };
  s.party = s.party.map((p, i) => (i === s.active ? nu : p));
  s.log.push(`상대의 공격! ${u.mon.name}(이)가 크게 당했다!`);
  if (nu.hp <= 0) {
    const next = s.party.findIndex((p, i) => i !== s.active && p.hp > 0);
    if (next === -1) s.over = 'lost';
    else {
      s.active = next;
      s.log.push(`${nu.mon.name}(은)는 쓰러졌다!`);
    }
  }
  return s;
}

/** 전투 후 경험치. 레벨은 도감 완성도와 무관하게 서사 진행에 맞춰 올라갑니다. */
export function grantExp(unit, foe) {
  const gain = Math.max(1, Math.floor((foe.level * 3) / 2));
  let { level } = unit;
  let exp = (unit.exp ?? 0) + gain;
  const need = (l) => l * 12;
  while (exp >= need(level) && level < 100) {
    exp -= need(level);
    level++;
  }
  if (level === unit.level) return { ...unit, exp };
  const s = stats(unit.mon, level);
  return { ...unit, level, exp, ...s, hp: Math.min(s.maxHp, unit.hp + (s.maxHp - unit.maxHp)) };
}

export function healParty(party) {
  return party.map((u) => ({ ...u, hp: u.maxHp }));
}
