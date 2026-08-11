/* 오버월드 시뮬레이션. 걷기·충돌·워프·이벤트·인카운터.
   렌더링을 모르고 React도 모릅니다 — 타일 좌표와 진행률만 다룹니다. */

import { parseMap, isSolid, isEncounterTile } from '../engine/map.ts';
import { MAPS } from '../../content/maps.ts';
import { testAll } from './state.ts';

export const STEP_MS = 160; // 한 칸
export const RUN_MS = 96;
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** HGSS처럼 파트너가 뒤를 따라옵니다. 지나온 칸을 기억했다가 한 칸 늦게 밟습니다. */
const TRAIL = 2;

export function createWorld(mapId, state, { onEvent, rng = Math.random } = {}) {
  let map = load(mapId);
  let px = state.x;
  let py = state.y;
  let dir = state.dir ?? 'down';
  let moving = null; // { fx, fy, tx, ty, t, ms }
  let trail = seedTrail(px, py, dir);
  let stepsSince = 0;
  let pending = null; // 이번 프레임에 밖으로 낼 것

  function load(id) {
    const def = MAPS[id];
    if (!def) throw new Error(`없는 맵: ${id}`);
    return parseMap(def);
  }

  /* 파트너는 한 칸 뒤에서 시작합니다. 같은 칸에서 시작하면 걷기 전까지 겹쳐 보입니다.
     뒤가 막혀 있으면(벽을 등지고 스폰) 어쩔 수 없이 같은 칸에 둡니다. */
  function seedTrail(x, y, d) {
    const [dx, dy] = DIRV[d] ?? [0, 1];
    const bx = x - dx;
    const by = y - dy;
    const here = { x, y, dir: d };
    if (bx < 0 || by < 0 || bx >= map.w || by >= map.h || isSolid(map, bx, by)) return [here];
    return [here, { x: bx, y: by, dir: d }];
  }

  /** NPC가 서 있는 칸도 막힙니다. 맵 파서는 NPC를 모르므로 여기서 겹쳐 봅니다. */
  function blocked(x, y) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return true;
    if (isSolid(map, x, y)) return true;
    return (map.npcs ?? []).some((n) => n.x === x && n.y === y);
  }

  function at(list, x, y) {
    return (list ?? []).find((e) => e.x === x && e.y === y);
  }

  /** 방향키. 이미 걷는 중이면 무시합니다 — 그리드 이동이라 한 칸씩만 갑니다. */
  function press(d, run = false) {
    if (moving || !d) return;
    // 방향만 바뀌는 경우: 포켓몬은 제자리에서 한 번 돌아봅니다
    if (dir !== d) {
      dir = d;
      return;
    }
    const [dx, dy] = DIRV[d];
    const nx = px + dx;
    const ny = py + dy;
    if (blocked(nx, ny)) return;
    moving = { fx: px, fy: py, tx: nx, ty: ny, t: 0, ms: run ? RUN_MS : STEP_MS };
  }

  function update(dtMs) {
    if (!moving) return;
    moving.t += dtMs;
    if (moving.t < moving.ms) return;
    px = moving.tx;
    py = moving.ty;
    moving = null;
    stepsSince++;
    trail.unshift({ x: px, y: py, dir });
    if (trail.length > TRAIL + 1) trail.length = TRAIL + 1;
    arrive();
  }

  /** 한 칸 다 밟은 순간. 워프 → 트리거 → 인카운터 순으로 봅니다. */
  function arrive() {
    const w = at(map.warps, px, py);
    if (w) return emit({ kind: 'warp', warp: w });

    const ev = (map.events ?? []).find(
      (e) => e.type === 'trigger' && e.x === px && e.y === py && allowed(e),
    );
    if (ev) return emit({ kind: 'script', script: ev.script, event: ev });

    if (map.encounters && isEncounterTile(map, px, py)) {
      // 한 칸마다 독립 시행. 연속으로 안 나오게 최소 3칸은 쉽니다.
      if (stepsSince >= 3 && rng() < map.encounters.rate) {
        stepsSince = 0;
        return emit({ kind: 'encounter', mon: rollEncounter(map.encounters.table, rng) });
      }
    }
    return null;
  }

  /* 맵 이벤트의 unless는 "그게 아직 아니라면 발동" 입니다 — 스크립트 명령의 unless와 반대라
     여기서만 이 뜻으로 씁니다. once는 플래그로 기억합니다. */
  function allowed(e) {
    if (e.once && state.flags.includes(`ev.${e.script}`)) return false;
    if (e.unless && testAll(state, e.unless)) return false;
    return true;
  }

  /** A버튼. 바라보는 칸의 NPC나 interact 이벤트를 집습니다. */
  function interact() {
    const [dx, dy] = DIRV[dir];
    const fx = px + dx;
    const fy = py + dy;
    const npc = at(map.npcs, fx, fy);
    if (npc) return { kind: 'script', script: npc.script, npc, faceBack: true };
    const ev = (map.events ?? []).find(
      (e) => e.type === 'interact' && e.x === fx && e.y === fy && allowed(e),
    );
    if (ev) return { kind: 'script', script: ev.script, event: ev };
    // 발밑도 봅니다 — 표지판을 밟고 서서 누르는 사람이 있습니다
    const under = (map.events ?? []).find(
      (e) => e.type === 'interact' && e.x === px && e.y === py && allowed(e),
    );
    return under ? { kind: 'script', script: under.script, event: under } : null;
  }

  function emit(x) {
    pending = x;
    onEvent?.(x);
    return x;
  }

  function goto(id, x, y, d) {
    map = load(id);
    px = x;
    py = y;
    dir = d ?? dir;
    moving = null;
    stepsSince = 0;
    trail = seedTrail(px, py, dir);
    const enter = (map.events ?? []).find((e) => e.type === 'enter' && allowed(e));
    return enter ? { kind: 'script', script: enter.script, event: enter } : null;
  }

  /** 렌더러가 쓸 값. 픽셀 좌표는 타일 단위 소수입니다 — 배율은 렌더러가 곱합니다. */
  function view() {
    const p = moving ? moving.t / moving.ms : 0;
    const x = moving ? moving.fx + (moving.tx - moving.fx) * p : px;
    const y = moving ? moving.fy + (moving.ty - moving.fy) * p : py;
    // 걷기 프레임은 한 칸에 한 번 바뀝니다. 진행률의 앞뒤 절반으로 가릅니다.
    const frame = moving ? (p < 0.5 ? 1 : 0) : 0;
    return {
      map,
      player: { x, y, tx: px, ty: py, dir, moving: !!moving, frame },
      follower: follower(p),
      trail,
    };
  }

  /* 파트너는 한 칸 뒤를 따라옵니다. 플레이어가 서 있으면 같이 섭니다. */
  function follower(p) {
    const a = trail[1] ?? trail[0];
    const b = trail[0];
    if (!moving || !a) return { x: a?.x ?? px, y: a?.y ?? py, dir: a?.dir ?? dir, frame: 0 };
    return {
      x: a.x + (b.x - a.x) * p,
      y: a.y + (b.y - a.y) * p,
      dir: b.dir,
      frame: p < 0.5 ? 1 : 0,
    };
  }

  return {
    press, update, interact, goto, view,
    get map() { return map; },
    get pos() { return { x: px, y: py, dir }; },
    get moving() { return !!moving; },
    takePending() { const p = pending; pending = null; return p; },
  };
}

/** 가중치 표에서 하나 뽑기. 합이 100인지는 test/content.test.js가 봅니다. */
export function rollEncounter(table, rng = Math.random) {
  const total = table.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [id, w] of table) {
    r -= w;
    if (r <= 0) return id;
  }
  return table[table.length - 1][0];
}

/** 카메라. 맵 가장자리에서는 더 밀지 않습니다 — 검은 띠가 보이지 않게. */
export function camera(view, viewW, viewH) {
  const { player, map } = view;
  const cx = clamp(player.x - viewW / 2 + 0.5, 0, Math.max(0, map.w - viewW));
  const cy = clamp(player.y - viewH / 2 + 0.5, 0, Math.max(0, map.h - viewH));
  return { x: map.w <= viewW ? (map.w - viewW) / 2 : cx, y: map.h <= viewH ? (map.h - viewH) / 2 : cy };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
