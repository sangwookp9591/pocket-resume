/* 여덟 개의 맵. 계약 4절의 ASCII 포맷입니다.
   맵 에디터를 만들지 않기 위해 텍스트로 씁니다 — diff가 읽히는 것이 덤입니다.
   행 길이가 어긋나면 test/maps.test.js가 잡습니다. 눈으로 세지 마세요. */

import type { Building, MapDef, MapId } from './types.ts';

// 표에 없는 대문자 = 건물. 여덟 맵이 같은 글자를 씁니다.
const BLD: Record<string, Building> = {
  A: { obj: 'bld-lab', w: 4, h: 3 },
  H: { obj: 'bld-house', w: 3, h: 2 },
  O: { obj: 'bld-office-1', w: 4, h: 3 },
  G: { obj: 'bld-office-2', w: 4, h: 3 },
  U: { obj: 'bld-office-3', w: 4, h: 3 },
  Z: { obj: 'bld-tower', w: 5, h: 4 },
  Q: { obj: 'bld-cafe', w: 3, h: 2 },
  Y: { obj: 'bld-gym', w: 4, h: 3 },
};

export const MAPS: Record<MapId, MapDef> = {
  // ── 0. 아잉 연구소 (실내) ────────────────────────────────────────
  lab: {
    id: 'lab',
    name: '아잉 연구소',
    time: 'dawn',
    indoor: true,
    ground: `
ffffffffffffff
ffffffffffffff
ffffffffffffff
ffffffffffffff
fffffcccccffff
fffffcccccffff
fffffcccccffff
ffffffffffffff
ffffffffffffff
ffffffffffffff
ffffffffffffff`,
    over: `
WWWWWWWWWWWWWW
WNN........NNW
W.B..........W
W.B...P......W
W............W
W............W
W............W
W............W
W............W
W............W
WWWWWWdWWWWWWW`,
    legend: BLD,
    spawn: { x: 6, y: 8, dir: 'up' },
    warps: [{ x: 6, y: 10, to: 'newbie-town', tx: 11, ty: 3, dir: 'down' }],
    npcs: [{ id: 'prof', x: 9, y: 3, dir: 'down', sprite: 'prof', script: 'lab.prof' }],
    events: [
      { type: 'enter', script: 'lab.open', once: true },
      { type: 'interact', x: 6, y: 3, script: 'lab.balls' },
      // 스타터를 고르기 전에는 나갈 수 없습니다. 조용히 막지 말고 박사가 부릅니다.
      { type: 'trigger', x: 6, y: 9, script: 'lab.blockExit', unless: 'starterChosen' },
    ],
  },

  // ── 1. 뉴비마을 — 첫 회사 ───────────────────────────────────────
  'newbie-town': {
    id: 'newbie-town',
    name: '뉴비마을',
    time: 'morning',
    ground: `
........................
........................
........................
....------------------..
....-.......-........-..
....-.......-........-..
....-.......-........-..
....-.......-........-..
....------------------..
...........--...........
...........--...........
...........--...........
...........--...........
.,,,,,.....--......,,,,.
.,,,,,.....--......,,,,.
.,,,,,.....--......,,,,.
...........--...........
...........--...........`,
    over: `
TTTTTTTTTTA...TTTTTTTTTT
T......................T
T......................T
T..........d...........T
T....H..........O......T
T......................T
T.....d................T
T................d.....T
T.........S............T
T......................T
T....t.............t...T
T......................T
T......................T
Tggggg.............ggggT
Tggggg.............ggggT
Tggggg.............ggggT
T......................T
TTTTTTTTTT..TTTTTTTTTTTT`,
    legend: BLD,
    spawn: { x: 11, y: 3, dir: 'down' },
    warps: [
      { x: 11, y: 3, to: 'lab', tx: 6, ty: 9, dir: 'up' },
      { x: 17, y: 7, to: 'night-office', tx: 7, ty: 10, dir: 'up' },
      { x: 10, y: 17, to: 'wave-harbor', tx: 11, ty: 1, dir: 'down' },
      { x: 11, y: 17, to: 'wave-harbor', tx: 12, ty: 1, dir: 'down' },
    ],
    npcs: [
      { id: 'senior', x: 16, y: 8, dir: 'down', sprite: 'npc-senior', script: 'newbie.senior' },
      { id: 'villager', x: 6, y: 10, dir: 'right', sprite: 'npc-junior', script: 'newbie.villager' },
    ],
    encounters: { rate: 0.11, table: [['spring', 100]] },
    events: [
      { type: 'enter', script: 'newbie.arrive', once: true },
      { type: 'interact', x: 10, y: 8, script: 'newbie.sign' },
      // 사수와 이야기하기 전에는 남쪽으로 못 갑니다.
      { type: 'trigger', x: 10, y: 16, script: 'newbie.gate', unless: 'badge.confidence' },
      { type: 'trigger', x: 11, y: 16, script: 'newbie.gate', unless: 'badge.confidence' },
    ],
  },

  // ── 2. 야근 사무실 (실내) ───────────────────────────────────────
  'night-office': {
    id: 'night-office',
    name: '야근 사무실',
    time: 'night',
    indoor: true,
    ground: `
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff
ffffffffffffffff`,
    over: `
WWWWWWWWWWWWWWWW
WNN..........NNW
W..P.....P.....W
W..............W
W..P.....P.....W
W..............W
W..P.....P.....W
W..............W
WB.............W
WB.............W
W..............W
WWWWWWWdWWWWWWWW`,
    legend: BLD,
    spawn: { x: 7, y: 10, dir: 'up' },
    warps: [{ x: 7, y: 11, to: 'newbie-town', tx: 17, ty: 7, dir: 'down' }],
    npcs: [],
    events: [
      { type: 'enter', script: 'office.arrive', once: true },
      // 책상 세 개가 곧 세 번의 야근입니다. 순서는 상관없습니다.
      { type: 'interact', x: 3, y: 2, script: 'office.learn.springboot' },
      { type: 'interact', x: 3, y: 4, script: 'office.learn.jpa' },
      { type: 'interact', x: 3, y: 6, script: 'office.learn.react' },
      { type: 'interact', x: 9, y: 4, script: 'office.window' },
      { type: 'trigger', x: 7, y: 10, script: 'office.leave' },
    ],
  },

  // ── 3. 파도항구 — 두 번째 회사 ──────────────────────────────────
  'wave-harbor': {
    id: 'wave-harbor',
    name: '파도항구',
    time: 'noon',
    ground: `
..........................
..........................
....------------------....
....-................-....
....-................-....
....-................-....
....------------------....
..........----............
..........----............
ssssssssss----ssssssssssss
ssssssssss====ssssssssssss
~~~~~~~~~~====~~~~~~~~~~~~
~~~~~~~~~~====~~~~~~~~~~~~
~~~~~~~~~~%%%%~~~~~~~~~~~~
~~~~~~~~~~%%%%~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~`,
    over: `
TTTTTTTTTT..TTTTTTTTTTTTTT
T........................T
T........................T
T.....G.........Y........T
T........................T
T........................T
T......d.........d.......T
T........................T
T....................Q...T
T.........S..............T
T.....................d..T
..........................
..........................
..........................
..........................
..........................
..........................
..........................`,
    legend: BLD,
    spawn: { x: 11, y: 1, dir: 'down' },
    warps: [
      { x: 10, y: 0, to: 'newbie-town', tx: 10, ty: 16, dir: 'up' },
      { x: 11, y: 0, to: 'newbie-town', tx: 11, ty: 16, dir: 'up' },
      { x: 11, y: 13, to: 'share-village', tx: 11, ty: 14, dir: 'down' },
      { x: 12, y: 13, to: 'share-village', tx: 12, ty: 14, dir: 'down' },
    ],
    npcs: [
      { id: 'ace', x: 12, y: 12, dir: 'up', sprite: 'npc-ace', script: 'harbor.ace' },
      { id: 'nurse', x: 21, y: 10, dir: 'down', sprite: 'npc-nurse', script: 'harbor.nurse' },
    ],
    encounters: { rate: 0.09, table: [['reactnative', 55], ['aws', 45]] },
    events: [
      { type: 'enter', script: 'harbor.arrive', once: true },
      { type: 'interact', x: 10, y: 9, script: 'harbor.sign' },
    ],
  },

  // ── 4. 공유마을 — 세 번째 회사 ──────────────────────────────────
  'share-village': {
    id: 'share-village',
    name: '공유마을',
    time: 'afternoon',
    ground: `
......................
......................
...----------------...
...-..............-...
...-..............-...
...-......--......-...
...-......--......-...
...----------------...
..........--..........
..........--..........
,,,,,.....--.....,,,,,
,,,,,.....--.....,,,,,
,,,,,.....--.....,,,,,
..........--..........
..........--..........
......................`,
    over: `
TTTTTTTTTT..TTTTTTTTTT
T....................T
T....................T
T....H.......U.......T
T.......K............T
T.....d..............T
T.............d......T
T....................T
T....................T
T....................T
Tgggg............ggggT
Tgggg............ggggT
Tgggg............ggggT
T....................T
T....................T
TTTTTTTTTT..TTTTTTTTTT`,
    legend: BLD,
    spawn: { x: 11, y: 14, dir: 'up' },
    warps: [
      { x: 10, y: 0, to: 'wave-harbor', tx: 11, ty: 12, dir: 'up' },
      { x: 11, y: 0, to: 'zivo-city', tx: 11, ty: 18, dir: 'up' },
      { x: 10, y: 15, to: 'wave-harbor', tx: 11, ty: 12, dir: 'down' },
      { x: 11, y: 15, to: 'wave-harbor', tx: 12, ty: 12, dir: 'down' },
    ],
    npcs: [
      { id: 'junior1', x: 7, y: 5, dir: 'right', sprite: 'npc-junior', script: 'share.junior1' },
      { id: 'junior2', x: 9, y: 4, dir: 'left', sprite: 'npc-junior', script: 'share.junior2' },
      { id: 'lead', x: 14, y: 7, dir: 'down', sprite: 'npc-lead', script: 'share.lead' },
    ],
    encounters: { rate: 0.08, table: [['ainews', 60], ['insight', 40]] },
    events: [
      { type: 'enter', script: 'share.arrive', once: true },
      { type: 'interact', x: 8, y: 4, script: 'share.campfire' },
      { type: 'trigger', x: 11, y: 1, script: 'share.gate', unless: 'badge.insight' },
    ],
  },

  // ── 5. ZIVO 시티 — 현재 회사 ────────────────────────────────────
  'zivo-city': {
    id: 'zivo-city',
    name: 'ZIVO 시티',
    time: 'noon',
    ground: `
..........................
..........................
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
...%%%%%%%%%%%%%%%%%%%%...
..........----............
..........----............
..........----............
..........----............
..........----............
..........----............
..........----............`,
    over: `
TTTTTTTTTT....TTTTTTTTTTTT
T........................T
T........................T
T.........Z..............T
T........................T
T........................T
T........................T
T...........d............T
T........................T
T...Q....................T
T........................T
T....d...................T
T..L................L....T
T........................T
T........................T
T.......M................T
T........................T
T........................T
T........................T
TTTTTTTTTT....TTTTTTTTTTTT`,
    legend: BLD,
    spawn: { x: 11, y: 18, dir: 'up' },
    warps: [
      { x: 10, y: 19, to: 'share-village', tx: 11, ty: 1, dir: 'down' },
      { x: 11, y: 19, to: 'share-village', tx: 11, ty: 1, dir: 'down' },
      { x: 12, y: 7, to: 'zivo-tower', tx: 8, ty: 12, dir: 'up' },
      { x: 10, y: 0, to: 'champion-road', tx: 7, ty: 20, dir: 'up' },
      { x: 11, y: 0, to: 'champion-road', tx: 8, ty: 20, dir: 'up' },
    ],
    npcs: [{ id: 'nurse2', x: 5, y: 12, dir: 'down', sprite: 'npc-nurse', script: 'city.nurse' }],
    encounters: null,
    events: [
      { type: 'enter', script: 'city.arrive', once: true },
      { type: 'interact', x: 8, y: 15, script: 'city.mailbox' },
      // 타워를 끝내지 않으면 챔피언 로드가 열리지 않습니다.
      { type: 'trigger', x: 10, y: 1, script: 'city.gate', unless: 'badge.connect' },
      { type: 'trigger', x: 11, y: 1, script: 'city.gate', unless: 'badge.connect' },
    ],
  },

  // ── 6. ZIVO 타워 (실내) — 세 저장소가 세 구역 ────────────────────
  'zivo-tower': {
    id: 'zivo-tower',
    name: 'ZIVO 타워',
    time: 'noon',
    indoor: true,
    ground: `
ffffffffffffffffff
ffffffffffffffffff
ffffffffffffffffff
ffffffffffffffffff
ffffffffffffffffff
ffffffffffffffffff
ffffffffffffffffff
ffffffffffffffffff
ffffffccccccffffff
ffffffccccccffffff
ffffffccccccffffff
ffffffccccccffffff
ffffffccccccffffff
ffffffccccccffffff`,
    over: `
WWWWWWWWWWWWWWWWWW
WNN..W......W..NNW
W.P..W.P....W.P..W
W....W......W....W
W.P..W.P....W.P..W
W....W......W....W
W.B..d......d.B..W
W....W......W....W
WWWWWW......WWWWWW
WWWWWW......WWWWWW
WWWWWW......WWWWWW
WWWWWW..P...WWWWWW
WWWWWW......WWWWWW
WWWWWWWWdWWWWWWWWW`,
    legend: BLD,
    spawn: { x: 8, y: 12, dir: 'up' },
    warps: [{ x: 8, y: 13, to: 'zivo-city', tx: 12, ty: 8, dir: 'down' }],
    npcs: [{ id: 'lead2', x: 9, y: 10, dir: 'down', sprite: 'npc-lead', script: 'tower.lead' }],
    events: [
      { type: 'enter', script: 'tower.arrive', once: true },
      // 왼쪽 구역 = FRONT
      { type: 'interact', x: 2, y: 2, script: 'tower.front.nextjs' },
      { type: 'interact', x: 2, y: 4, script: 'tower.front.vanilla' },
      { type: 'interact', x: 2, y: 6, script: 'tower.front.playwright' },
      // 가운데 구역 = ADMIN
      { type: 'interact', x: 7, y: 2, script: 'tower.admin.fsd' },
      { type: 'interact', x: 7, y: 4, script: 'tower.admin.rbac' },
      { type: 'interact', x: 8, y: 11, script: 'tower.admin.archunit' },
      // 오른쪽 구역 = BACK
      { type: 'interact', x: 14, y: 2, script: 'tower.back.opensearch' },
      { type: 'interact', x: 14, y: 4, script: 'tower.back.resilience' },
      { type: 'interact', x: 14, y: 6, script: 'tower.back.outbox' },
    ],
  },

  // ── 7. 챔피언 로드 ──────────────────────────────────────────────
  'champion-road': {
    id: 'champion-road',
    name: '챔피언 로드',
    time: 'dusk',
    ground: `
....%%%%%%%%....
....%%%%%%%%....
....%%%%%%%%....
....%%%%%%%%....
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......
......%%%%......`,
    over: `
RRRR........RRRR
RRRR........RRRR
RRRR........RRRR
RRRR........RRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR
RRRRRR....RRRRRR`,
    legend: BLD,
    spawn: { x: 7, y: 20, dir: 'up' },
    warps: [
      { x: 7, y: 20, to: 'zivo-city', tx: 10, ty: 1, dir: 'down' },
      { x: 8, y: 20, to: 'zivo-city', tx: 11, ty: 1, dir: 'down' },
    ],
    npcs: [{ id: 'aing-final', x: 7, y: 2, dir: 'down', sprite: 'aing', script: 'road.finale' }],
    encounters: null,
    events: [
      { type: 'enter', script: 'road.arrive', once: true },
      { type: 'trigger', x: 7, y: 4, script: 'road.recap', once: true },
      { type: 'trigger', x: 8, y: 4, script: 'road.recap', once: true },
    ],
  },
};

export const MAP_ORDER: MapId[] = [
  'lab',
  'newbie-town',
  'night-office',
  'wave-harbor',
  'share-village',
  'zivo-city',
  'zivo-tower',
  'champion-road',
];
