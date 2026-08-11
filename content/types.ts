/* 도메인 타입. **이 파일이 계약입니다** — content·lib·components가 전부 여기를 봅니다.
   id를 string으로 두면 오타가 런타임까지 갑니다. 유니온으로 박아 두면 컴파일러가 잡습니다. */

export type MonId =
  | 'spring' | 'springboot' | 'jpa' | 'react'
  | 'reactnative' | 'aws'
  | 'insight' | 'ainews'
  | 'nextjs' | 'fsd' | 'playwright' | 'rbac' | 'opensearch'
  | 'resilience' | 'outbox' | 'archunit' | 'vanilla' | 'webgpu';

export type TypeId = 'FRONT' | 'BACK' | 'INFRA' | 'QUALITY' | 'ARCH' | 'TEAM';

export type BadgeId = 'confidence' | 'humility' | 'insight' | 'connect';

export type MapId =
  | 'lab' | 'newbie-town' | 'night-office' | 'wave-harbor'
  | 'share-village' | 'zivo-city' | 'zivo-tower' | 'champion-road';

export type Dir = 'up' | 'down' | 'left' | 'right';
export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';

/** 아잉의 표정. 마스코트 킷의 16종과 같은 이름입니다. */
export type Face =
  | 'neutral' | 'happy' | 'cheer' | 'proud' | 'wink' | 'wow' | 'love' | 'shy'
  | 'thinking' | 'focused' | 'confused' | 'surprised' | 'sad' | 'pout' | 'relief' | 'sleepy';

/* ── 기술몬 ───────────────────────────────────────────────────── */

export interface Stats { hp: number; atk: number; def: number; spd: number }

export interface Mon {
  id: MonId;
  no: number;
  name: string;
  en: string;
  type: TypeId;
  /** 몇 번째 회사에서 얻는가 (1~4) */
  where: 1 | 2 | 3 | 4;
  starter?: boolean;
  /** 도감 설명 = 실제 이력 문장의 축약 */
  dex: string;
  flavor: string;
  moves: [string, string, string, string];
  base: Stats;
  /** 높을수록 잘 잡힙니다 (0~255) */
  catchRate: number;
  /** 근거가 되는 content/wiki.ts 조각. 없으면 null */
  wiki: string | null;
}

export interface Starter {
  id: 'java' | 'javascript' | 'sql';
  name: string;
  type: TypeId;
  mon: MonId;
  line: string;
}

/* ── 서사 ─────────────────────────────────────────────────────── */

export interface Chapter {
  n: 1 | 2 | 3 | 4;
  id: string;
  map: MapId;
  place: string;
  role: string;
  /** 근거 등급. self=본인 진술, git=커밋 분석 */
  evidence: 'self' | 'git';
  headline: string;
  banner: string;
  story: string;
  lesson: string;
  badge: BadgeId;
  gets: MonId[];
}

export interface Badge { name: string; hue: string; from: string; got: string }

export interface WikiChunk {
  id: string;
  title: string;
  tags: string;
  text: string;
  /** 아래 세부 조각들을 거느리는 개요인가. 검색에서 양보시킵니다 */
  overview?: boolean;
}

/* ── 맵 ───────────────────────────────────────────────────────── */

export interface Warp { x: number; y: number; to: MapId; tx: number; ty: number; dir?: Dir }
export interface Npc { id: string; x: number; y: number; dir: Dir; sprite: string; script: string }

export interface MapEvent {
  type: 'enter' | 'interact' | 'trigger';
  x?: number;
  y?: number;
  script: string;
  once?: boolean;
  /** 이 조건이 **아직 아닐 때만** 발동합니다. 스크립트 명령의 unless와 뜻이 반대입니다 */
  unless?: string;
}

export interface Building { obj: string; w: number; h: number }

export interface MapDef {
  id: MapId;
  name: string;
  time: TimeOfDay;
  indoor?: boolean;
  ground: string;
  over: string;
  legend: Record<string, Building>;
  spawn: { x: number; y: number; dir: Dir };
  warps?: Warp[];
  npcs?: Npc[];
  encounters?: { rate: number; table: Array<[MonId, number]> } | null;
  events?: MapEvent[];
}

/* ── 대사 스크립트 ─────────────────────────────────────────────── */

export interface BattleSpec {
  mon: MonId;
  level?: number;
  bg?: 1 | 2 | 3 | 4 | 5;
  intro?: string;
  trainer?: string;
  /** 'lose'면 무엇을 해도 집니다. 게임플레이가 아니라 서사인 배틀입니다 */
  scripted?: 'win' | 'lose' | null;
}

export interface Choice { label: string; desc?: string; then?: Cmd[] }

/** 명령 한 줄이 한 동작. 전부 선택 필드라 한 줄에 여럿을 실을 수 있습니다. */
export interface Cmd {
  t?: string;
  who?: string;
  face?: Face;
  input?: 'name';
  choose?: Choice[];
  give?: MonId;
  dex?: MonId;
  badge?: BadgeId;
  battle?: BattleSpec;
  set?: string;
  /** 조건이 아직 아니면 t를 말하고 나머지를 버립니다 */
  unless?: string;
  /** 조건이 전부 참이 아니면 조용히 나머지를 버립니다 */
  require?: string;
  block?: true;
  heal?: true;
  warp?: { to: MapId; x: number; y: number };
  scene?: 'hall' | 'credits';
  fx?: 'shake' | 'flash' | 'fade';
  wait?: number;
  banner?: string;
}

/* ── 세이브 ───────────────────────────────────────────────────── */

export interface PartyUnit {
  id: MonId;
  mon: Mon;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  exp?: number;
  moveIdx: number;
}

export interface GameState {
  name: string;
  starter: string | null;
  map: MapId;
  x: number;
  y: number;
  dir: Dir;
  party: PartyUnit[];
  dex: MonId[];
  badges: BadgeId[];
  flags: string[];
  playtime: number;
  steps: number;
  startedAt: number | null;
}
