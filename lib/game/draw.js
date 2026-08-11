/* 월드를 렌더러에 그립니다. 렌더러는 "무엇을 어디에"만 받고, "왜"는 여기 있습니다.

   깊이 규칙 하나가 이 파일의 전부입니다:
   **아래에 있는 것이 위에 있는 것을 가린다.** 그래서 depth = 발끝의 y좌표입니다.
   나무 뒤로 걸어 들어가면 가려지고, 나무 앞으로 나오면 나무를 가립니다. */

import { TILE, VIEW_W, VIEW_H } from '../engine/config.js';
import { GROUND_TILE, OVER_OBJ } from '../engine/map.js';
import { EDGE_PAIRS, edgeKey, WATER_FRAMES } from '../engine/tilegen.js';
import { charKey, objKey } from './assets.js';

const GROUND_DEPTH = -1e6;
/** 위로 넘치는 오브젝트의 실제 높이(타일). assets.js의 OBJECTS와 같은 값이어야 합니다. */
const OBJ_H = {
  'bld-lab': 3, 'bld-house': 2, 'bld-office-1': 3, 'bld-office-2': 3, 'bld-office-3': 3,
  'bld-tower': 4, 'bld-cafe': 2, 'bld-gym': 3, tree: 2, lamp: 2, shelf: 2,
};
const OBJ_W = {
  'bld-lab': 4, 'bld-house': 3, 'bld-office-1': 4, 'bld-office-2': 4, 'bld-office-3': 4,
  'bld-tower': 5, 'bld-cafe': 3, 'bld-gym': 4, tree: 2, desk: 2,
};
/** 바람에 흔들리는 것. 셰이더가 윗변만 좌우로 밉니다. */
const SWAYS = new Set(['bush', 'flower', 'tree', 'tree-small', 'campfire']);
/** 지면에 눕는 것 — 깊이 정렬에서 빠져 항상 바닥에 깔립니다. */
const FLAT = new Set(['door', 'stairs']);

const ch = (arr, w, x, y) => String.fromCharCode(arr[y * w + x]);

/** 물은 3프레임. 맵 전체가 같은 위상으로 흘러야 이음매가 안 보입니다. */
function waterFrame(timeMs) {
  return WATER_FRAMES[Math.floor(timeMs / 420) % WATER_FRAMES.length];
}

/** 오토타일. base 타일의 이웃에 other가 있으면 스며드는 변형을 씁니다. */
function groundTileName(map, x, y, timeMs) {
  const g = ch(map.ground, map.w, x, y);
  const base = GROUND_TILE[g];
  if (!base) return null;
  if (base === 'water') return waterFrame(timeMs);

  for (const [b, other] of EDGE_PAIRS) {
    if (base !== b) continue;
    const oc = Object.keys(GROUND_TILE).find((k) => GROUND_TILE[k] === other);
    let mask = 0;
    if (y > 0 && ch(map.ground, map.w, x, y - 1) === oc) mask |= 1;
    if (x < map.w - 1 && ch(map.ground, map.w, x + 1, y) === oc) mask |= 2;
    if (y < map.h - 1 && ch(map.ground, map.w, x, y + 1) === oc) mask |= 4;
    if (x > 0 && ch(map.ground, map.w, x - 1, y) === oc) mask |= 8;
    if (mask) return edgeKey(b, other, mask);
  }
  return base;
}

/**
 * 한 프레임.
 * @param r        렌더러
 * @param view     world.view()
 * @param cam      {x,y} 타일 단위 카메라
 * @param opts     { timeMs, dexHas(id) }
 */
export function drawWorld(r, view, cam, { timeMs = 0 } = {}) {
  const { map, player, follower } = view;
  const cx = cam.x * TILE;
  const cy = cam.y * TILE;
  r.begin(cx, cy);

  // 보이는 범위만. 큰 맵에서 전부 그리면 인스턴스가 수천 개가 됩니다.
  const x0 = Math.max(0, Math.floor(cam.x) - 1);
  const y0 = Math.max(0, Math.floor(cam.y) - 1);
  const x1 = Math.min(map.w - 1, Math.ceil(cam.x + VIEW_W) + 1);
  const y1 = Math.min(map.h - 1, Math.ceil(cam.y + VIEW_H) + 3); // 아래는 키 큰 것 때문에 넉넉히

  // 1) 지면
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const name = groundTileName(map, x, y, timeMs);
      if (!name) continue;
      r.draw(`tile/${name}`, 0, 0, TILE, TILE, x * TILE, y * TILE, TILE, TILE, { depth: GROUND_DEPTH });
    }
  }

  // 2) 바닥에 눕는 것 (문·계단) — 지면 바로 위, 깊이 정렬 밖
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const id = objAt(map, x, y);
      if (id && FLAT.has(id)) {
        r.draw(objKey(id), 0, 0, TILE, TILE, x * TILE, y * TILE, TILE, TILE, { depth: GROUND_DEPTH + 1 });
      }
    }
  }

  // 3) 서 있는 것 + 캐릭터 — 발끝 y로 한 줄에 섞어 정렬
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const id = objAt(map, x, y);
      if (!id || FLAT.has(id)) continue;
      const tw = OBJ_W[id] ?? 1;
      const th = OBJ_H[id] ?? 1;
      const w = tw * TILE;
      const h = th * TILE;
      // 앵커는 좌상단이지만 그림은 아래로 정렬합니다 — 발끝이 맨 아랫줄에 닿게.
      const dx = x * TILE;
      const dy = (y + th) * TILE - h;
      r.draw(objKey(id), 0, 0, w, h, dx, dy, w, h, {
        depth: (y + th) * TILE,
        sway: SWAYS.has(id) ? 1 : 0,
      });
    }
  }

  // 4) NPC
  for (const n of map.npcs ?? []) {
    if (n.x < x0 - 2 || n.x > x1 + 2 || n.y < y0 - 2 || n.y > y1 + 2) continue;
    drawActor(r, n.sprite, n.x, n.y, n.dir ?? 'down', 0);
  }

  // 5) 파트너 → 플레이어 순. 같은 칸에 겹쳐도 플레이어가 앞이어야 합니다 —
  //    깊이가 같으면 정렬이 뒤집혀 아잉이 주인공을 덮습니다.
  drawActor(r, 'aing', follower.x, follower.y, follower.dir, follower.frame, 0.25);
  drawActor(r, 'hero', player.x, player.y, player.dir, player.frame, 0.75);

  // 6) 풀숲은 캐릭터 위에도 한 번 더 — 허리까지 잠겨 보이게. HGSS의 그 느낌입니다.
  for (const a of [follower, player]) {
    const tx = Math.round(a.x);
    const ty = Math.round(a.y);
    if (objAt(map, tx, ty) === 'bush') {
      r.draw(objKey('bush'), 0, TILE / 2, TILE, TILE / 2, tx * TILE, ty * TILE + TILE / 2, TILE, TILE / 2,
        { depth: (ty + 1) * TILE + 1, sway: 1 });
    }
  }

  r.present();
}

function objAt(map, x, y) {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return null;
  const c = ch(map.over, map.w, x, y);
  return OVER_OBJ[c] ?? map.legend?.[c]?.obj ?? null;
}

/** 캐릭터 한 명. side 스프라이트는 오른쪽을 볼 때 좌우 반전합니다. */
function drawActor(r, sprite, x, y, dir, frame, bias = 0.5) {
  const key = charKey(sprite, dir, frame);
  const w = TILE;
  const h = 48;
  r.draw(key, 0, 0, w, h, x * TILE, (y + 1) * TILE - h, w, h, {
    depth: (y + 1) * TILE + bias, // 같은 줄의 오브젝트보다 살짝 앞
    flipX: dir === 'right',
  });
}
