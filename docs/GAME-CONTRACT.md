# 포켓레주메 — 설계 계약

방향키로 걸어 다니며 박상욱(iron)의 개발 일대기를 플레이하는 탑다운 타일 RPG.
포켓몬 하트골드/소울실버(NDS)의 문법을 그대로 씁니다.

**이 문서는 계약입니다.** 에셋 워커·엔진 워커·콘텐츠가 여기 적힌 이름과 규격만 신뢰합니다.
여기 없는 것은 만들지 않습니다. 이름을 바꾸려면 이 문서를 먼저 고칩니다.

---

## 0. 한 줄 주제

> "기술 스택이 많은 개발자"가 아니라 **"문제를 만나면 필요한 기술을 연결해서 실제 서비스까지 만드는 개발자"**.

그래서 이 게임에서 **잡은 기술의 수는 엔딩 조건이 아닙니다.** 엔딩은 네 회사를 지나며
"연결"을 배웠는지로 갈립니다. 도감을 100% 채워도 최종 대사는 같습니다 — 그게 주제입니다.

---

## 1. 씬 흐름

```
title ─▶ intro(연구소) ─▶ world ⇄ battle ⇄ dex/menu ─▶ hall(명예의 전당) ─▶ credits
             │                 └─ warp ─▶ 실내맵
             └ 이름입력 · 스타터 선택
```

| 씬 | id | 내용 |
|---|---|---|
| 타이틀 | `title` | HGSS식 타이틀. 아잉이 화면을 가로지름. `PRESS ENTER` 점멸. 무입력 20초 → 데모 루프 |
| 오프닝 | `intro` | 아잉 박사 독백 → 이름 입력 → 스타터(첫 언어) 3택 → 파트너 아잉 합류 |
| 오버월드 | `world` | 8방향 아님. **4방향 그리드 이동.** 맵 8개 |
| 배틀 | `battle` | 턴제. 기술볼 포획. 스크립트 승/패 지원 |
| 도감 | `dex` | 잡은 기술 = 이력서 본문 |
| 메뉴 | `menu` | 도감 · 배지 · 트레이너카드 · 저장 |
| 전당 | `hall` | 명예의 전당 등록 연출 |
| 크레딧 | `credits` | 스탭롤 + 연락처 + `/iron.md` 링크 |

---

## 2. 여덟 개의 맵

서사는 **네 회사**입니다. 실제 이력을 장소로 옮깁니다.

| # | id | 장소 | 서사 | 획득 |
|:-:|---|---|---|---|
| 0 | `lab` | 아잉 연구소 (실내) | 시작. 첫 언어를 고른다 | 스타터 1종 · 기술볼 |
| 1 | `newbie-town` | 뉴비마을 — 첫 회사 | "Spring만 하면 돼" | Spring |
| 2 | `night-office` | 야근 사무실 (실내) | 혼자 Spring Boot·React·JPA를 습득 | 3종 · **자신감 배지** |
| 3 | `wave-harbor` | 파도항구 — 두 번째 회사 | React Native·AWS. 그리고 **패배** | 2종 · **겸손 배지** |
| 4 | `share-village` | 공유마을 — 세 번째 회사 | 신입 동료들의 정보 공유·AI 뉴스 | 인사이트 · **공유 배지** |
| 5 | `zivo-city` | ZIVO 시티 — 현재 회사 | 세 저장소가 세 구역 | — |
| 6 | `zivo-tower` | ZIVO 타워 (실내, 3층) | FRONT·ADMIN·BACK 층별 실무 | 10종 · **연결 배지** |
| 7 | `champion-road` | 챔피언 로드 | 마지막 문답 | 엔딩 |

씬 사이는 **걸어서** 이어집니다. 순간이동은 문(warp)뿐입니다.

---

## 3. 화면 규격

| 항목 | 값 | 이유 |
|---|---|---|
| 타일 | **32×32 px** | HGSS와 같음. 절차 타일(5.A)이 32px 네이티브로 이미 잘 나왔고, 그게 화면의 바닥 전체입니다 |
| 논리 해상도 | **512×352** (16×11 타일) | DS(256×192)보다 넓게. 웹에서 답답하지 않은 최소치 |
| 확대 | **정수배만** (1×~3×), `image-rendering: pixelated` | 픽셀 흐림 금지 |
| 캐릭터 | **32×48** (발끝이 타일 하단에 정렬, 위로 16px 넘침) | 머리가 타일을 넘는 HGSS 비율 |
| 기술몬 | **96×96** | 배틀 화면 전용. 여기만 큽니다 — 도감이 이력서라 얼굴이 보여야 합니다 |
| 이동 속도 | 1타일 / **160ms** (달리기 96ms) | HGSS 체감 |
| 걷기 프레임 | 2프레임 교대, 타일당 1회 전환 | |

---

## 4. 맵 데이터 포맷

맵은 **ASCII 아트**로 씁니다. 에디터를 만들지 않기 위해서입니다.
`content/maps/<id>.js`가 문자열 한 덩이와 범례를 내보냅니다.

```js
export default {
  id: 'newbie-town',
  name: '뉴비마을',
  time: 'morning',              // dawn | morning | noon | afternoon | dusk | night
  ground: `
    ................
    ..------------..
    ..-%%%--------..
  `,
  over: `
    TTTTTTTTTTTTTTTT
    T..............T
    T..H...........T
  `,
  legend: { /* 문자 → 타일/오브젝트 id. 아래 표 참조 */ },
  warps:  [{ x: 5, y: 3, to: 'night-office', tx: 4, ty: 8 }],
  npcs:   [{ id: 'senior', x: 7, y: 5, dir: 'down', sprite: 'npc-senior', script: 'newbie.senior' }],
  encounters: { rate: 0.08, table: [['spring', 60], ['java', 40]] },
  events: [{ type: 'trigger', x: 8, y: 2, once: true, script: 'newbie.gate' }],
};
```

### 4.1 범례 문자 (고정)

`ground` 레이어 — 밟히는 바닥. 충돌 없음.

| 문자 | 타일 | 문자 | 타일 |
|:-:|---|:-:|---|
| `.` | 잔디 `grass` | `,` | 짙은 잔디 `grass-dark` |
| `-` | 흙길 `path` | `%` | 돌바닥 `stone` |
| `~` | 물 `water` (애니 3프레임) | `s` | 모래 `sand` |
| `f` | 실내 마루 `floor` | `c` | 카펫 `carpet` |
| `=` | 다리 `bridge` | ` ` | 비움(검정) |

> `~`(물)과 ` `(비움)은 ground 레이어지만 **통행 불가**입니다. 나머지 ground는 전부 통행 가능.

`over` 레이어 — 위에 놓이는 것. **대문자는 충돌, 소문자는 통과**입니다. 예외 없습니다.

| 문자 | 오브젝트 | 문자 | 오브젝트 |
|:-:|---|:-:|---|
| `T` | 나무 `tree` | `t` | 작은 나무 `tree-small` |
| `R` | 바위 `rock` | `g` | **풀숲** `bush` (인카운터) |
| `S` | 표지판 `sign` | `F` | 울타리 `fence` |
| `L` | 가로등 `lamp` | `w` | 꽃 `flower` |
| `B` | 책장 `shelf` | `P` | PC 책상 `desk` |
| `M` | 우편함 `mailbox` | `.` | 없음 |
| `W` | 벽 (실내) | `N` | 창문 벽 (실내) |
| `C` | 카운터 (카페·접수) | `d` | **문 — 통과. warp 지점** |
| `K` | 캠프파이어 `campfire` | `e` | 계단 — 통과. warp 지점 |

**위 표에 없는 대문자는 맵별 `legend`가 정의합니다** — 주로 건물입니다.

```js
legend: {
  H: { obj: 'bld-house',     w: 3, h: 2 },   // 좌상단 한 칸에만 찍고, 파서가 w×h만큼 충돌을 채웁니다
  O: { obj: 'bld-office-1',  w: 4, h: 3 },
}
```

문(`d`)은 건물 발치에 **따로** 찍습니다. 건물 자체는 통째로 충돌이라 문을 뚫어 줘야 들어갑니다.

두 레이어의 **행·열 수가 다르면 로드 실패**로 처리하고 콘솔에 어느 줄이 몇 칸인지 찍습니다.
조용히 빈 맵이 되지 않게 합니다.

---

## 5. 에셋 목록

전부 `public/game/` 아래. **엔진이 이 이름을 참조합니다 — 이름을 바꾸지 마세요.**

### 5.0 외부 CC0 에셋을 먼저 쓴다

**AI가 픽셀아트에서 제일 못하는 것이 나무·집·울타리 같은 환경 소품입니다** — 장마다 스타일이 미묘하게
달라서 한 화면에 모아 놓으면 바로 티가 납니다. 사람이 손으로 찍은 팩을 쓰는 편이 싸고 확실합니다.

| 팩 | 라이선스 | 규격 | 지위 |
|---|---|---|---|
| [Ninja Adventure Asset Pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) ([github](https://github.com/pixel-boy/NinjaAdventure)) | **CC0** (표시 불요, 상업 이용 가능) | 16×16 | **폴백** — AI가 3번 실패한 오브젝트만 |

**조사하고 쓰지 않기로 한 이유를 남깁니다.** 처음 계획은 이 팩을 1순위로 쓰는 것이었습니다.
그런데 5.A의 절차 타일이 32px 네이티브로 나왔고(잔디 노이즈 1px, 오토타일 엣지 16종),
그 위에 16×16을 2배 확대한 오브젝트를 얹으면 **픽셀 크기가 2×2와 1×1로 갈려 바로 티가 납니다.**
바닥이 화면의 전부라 바닥에 맞추는 게 맞습니다. 그래서 32px AI 생성을 기본으로 두고,
이 팩은 실패했을 때 쓰는 폴백으로만 남깁니다.

- 폴백으로라도 한 장이라도 썼다면 **`docs/CREDITS.md`에 출처를 적습니다.** CC0라 표시 의무는
  없지만, 의무가 없는 것과 출처를 숨기는 것은 다른 문제입니다.
- 닌텐도/포켓몬의 실제 스프라이트는 **쓰지 않습니다.** 디컴파일 프로젝트(pret/pokeemerald,
  porytiles 등)의 타일도 마찬가지입니다 — 공개 이력서라 IP 리스크를 지지 않습니다. 문법만 빌립니다.
- 아잉·주인공·기술몬 18종은 어느 팩에도 없으므로 처음부터 AI 몫입니다.

### 5.A 지면 타일 — **생성하지 않음 (코드 절차 생성)**

잔디·흙길·물·돌바닥·모래·마루·카펫·다리는 `lib/engine/tilegen.js`가
오프스크린 캔버스에 그려 아틀라스로 굽습니다. AI로 seamless 타일을 만들면 이음매가 반드시 보입니다.
오토타일 엣지(잔디↔길, 물가)도 코드가 그립니다. **크레딧 0.**

### 5.B 캐릭터 스프라이트 — `char/<name>-<dir>[-2].webp`

- 규격: **32×48**, 투명 배경, 정면 도트. 발끝이 아래 변에 닿게.
- **생성은 1024 근처로 하고 2단계로 줄입니다** — 32×48을 직접 시키면 AI가 뭉갠 것을 뱉습니다.
- 방향: `down` · `up` · `side`. **`side`는 좌우 미러링**으로 씁니다 — 따로 만들지 않습니다.
- `-2` 접미사가 있으면 걷기 2프레임(다리만 다르게, 위치·크기 동일).

| 파일 | 누구 | 프레임 |
|---|---|:-:|
| `char/hero-{down,up,side}.webp`, `char/hero-{down,up,side}-2.webp` | 주인공 상욱. 검은 단발, 후드집업, 백팩 | 6 |
| `char/aing-{down,up,side}.webp`, `char/aing-{down,up,side}-2.webp` | 파트너 아잉 (주인공 뒤를 따라옴) | 6 |
| `char/prof-down.webp` | 아잉 박사. 흰 가운, 안경 | 1 |
| `char/npc-senior-down.webp` | 1사 사수. 와이셔츠, 피곤한 얼굴 | 1 |
| `char/npc-ace-down.webp` | 2사 실력자. 자신감 있는 자세 | 1 |
| `char/npc-junior-down.webp` | 3사 신입. 밝고 어린 | 1 |
| `char/npc-lead-down.webp` | 4사 팀원 | 1 |
| `char/npc-nurse-down.webp` | 카페 점원(포켓몬센터 역할) | 1 |

합계 **21장**.

### 5.C 기술몬 — `mon/<id>.webp`

- 규격: **96×96**, 투명 배경. 정면. 캐릭터가 프레임의 85%를 채우게.
- 기술 로고를 **그대로 넣지 않습니다.** 로고의 형태·색만 빌린 생물/정령으로 의인화합니다.

`spring` · `springboot` · `jpa` · `react` · `reactnative` · `aws` · `insight` · `ainews` ·
`nextjs` · `fsd` · `playwright` · `rbac` · `opensearch` · `resilience` · `outbox` ·
`archunit` · `vanilla` · `webgpu`

합계 **18장**.

### 5.D 건물·오브젝트 — `obj/<id>.webp`

- 규격: **투명 배경**, 폭은 타일 배수(1~5타일 = 32~160px), 높이는 자유(위로 넘침 허용).
- 정면에 가까운 **약간의 하이앵글**(HGSS의 3/4 시점).
- **생성은 1024로 하고 2단계로 줄입니다.** 32px를 직접 시키면 뭉갠 것이 나옵니다.

| id | 크기(타일) | 무엇 | id | 크기(타일) | 무엇 |
|---|:-:|---|---|:-:|---|
| `bld-lab` | 4×3 | 아잉 연구소. 흰 벽 파란 지붕 | `tree` | 2×2 | 침엽수 |
| `bld-house` | 3×2 | 시골집 | `tree-small` | 1×1 | 관목 |
| `bld-office-1` | 4×3 | 낡은 SI 사무실 | `rock` | 1×1 | 이끼 낀 바위 |
| `bld-office-2` | 4×3 | 항구의 유리 사옥 | `bush` | 1×1 | **풀숲**. 밝은 연두 |
| `bld-office-3` | 4×3 | 밝은 스타트업 사옥 | `sign` | 1×1 | 나무 표지판 (글자 없음) |
| `bld-tower` | 5×4 | ZIVO 타워. 유리 고층 | `fence` | 1×1 | 나무 울타리 |
| `bld-cafe` | 3×2 | 회복 카페. 빨간 지붕 | `lamp` | 1×2 | 가로등 |
| `bld-gym` | 4×3 | 체육관. 돌기둥 | `flower` | 1×1 | 들꽃 |
| `desk` | 2×1 | 모니터 놓인 책상 | `mailbox` | 1×1 | 우편함 |
| `shelf` | 1×2 | 책장 | `campfire` | 1×1 | 캠프파이어 |

합계 **20장**.

### 5.E 배틀 배경 — `bg/battle-<n>.webp`

- 규격: **512×192**, 불투명. 배틀 화면 상단 절반에 깔립니다.
- `battle-1` 풀숲 · `battle-2` 사무실 · `battle-3` 항구 · `battle-4` 밤하늘 · `battle-5` 타워 옥상

합계 **5장**.

### 5.F 타이틀 — `bg/title.webp`

- 규격: **512×352**. 새벽 언덕에서 아잉과 주인공의 뒷모습. 글자 없음. 생성은 1024×704로.

합계 **1장**.

### 만들지 않는 것

파티클·전환 이펙트·HP바·대화창·폰트·UI 프레임·낮밤 색조 — **전부 코드**입니다.
에셋보다 싸고, 크기 조절이 자유롭습니다.

---

## 6. 아트 규격 (모든 프롬프트 공통)

```
16-bit pixel art, Nintendo DS Pokemon HeartGold overworld style,
crisp readable pixels, limited palette, soft 3-tone shading, subtle outline,
slight top-down 3/4 perspective, no text, no letters, no logo, no watermark,
no cyberpunk, no neon, no hologram, no circuit pattern, no photorealism,
palette: soft ice blue #A8DDF0, lavender #B8B0E8, cream #F4F1EA,
deep indigo ink #2E2A6B, blush #F5C6D0, moss #7FA65C, pine #3E6B4A,
bark #7A5A42, soil #5C4433, dusk #E8A87C, ember #F2814F
```

투명 배경이 필요한 에셋(5.B·5.C·5.D)은 뒤에 붙입니다:
` , plain flat solid white background, isolated single subject, centered, no ground shadow, no props`

> 흰 배경을 시킨 뒤 `image_background_remover`로 뽑아냅니다. "transparent background"만
> 시키면 체크무늬를 그려 넣는 모델이 있습니다.

**아잉이 등장하는 에셋은 참조 이미지를 반드시 넣습니다** —
`/Users/iron/Project/psw/3d-web-profile/public/mascot/pose/idle.webp`.
단, 바이저의 뇌 아이콘과 몸의 회로 무늬는 빼고 **단순한 파란 고글/헤드폰**으로 갑니다(사이버 요소 금지 규칙).

### 후처리 (ffmpeg)

```bash
# 1) 배경 제거 → 2) 니어리스트 축소 → 3) WebP
ffmpeg -y -i in.png -vf "scale=32:48:flags=neighbor" -c:v libwebp -lossless 1 out.webp
```

- 투명 에셋은 **무손실 WebP**, 배경은 **품질 82**.
- 배경 1장이 **120KB**를 넘지 않게. 전체 합계 **2.5MB 이하**.

---

## 7. 크레딧 예산

상한 **300**. 잔액은 `higgsfield account status`로 확인합니다(현재 785.5).

| 항목 | 모델 | 단가 | 수량 | 소계 |
|---|---|---:|---:|---:|
| 캐릭터 21 | `nano_banana_flash` (아잉 참조) | 1.5 | 21 | 31.5 |
| 기술몬 18 | `nano_banana_flash` | 1.5 | 18 | 27 |
| 건물·오브젝트 20 | `nano_banana_flash` | 1.5 | 20 | 30 |
| 배틀 배경 5 | `nano_banana_flash` | 1.5 | 5 | 7.5 |
| 타이틀 1 | `gpt_image_2` | 7 | 1 | 7 |
| 배경 제거 ~52 | `image_background_remover` | ~0.2 | 52 | ~11 |
| **소계** | | | **65** | **≈115** |
| 재시도 여유 | | | | ~185 |
| **상한** | | | | **300** |

한 에셋은 **3번까지** 다시 만듭니다. 3번 실패하면 건너뛰고 `docs/ASSET-REPORT.md`에
실패로 적습니다 — 예산을 한 장에 태우지 않습니다.

---

## 8. 엔진 계약

`lib/engine/` 아래. **React를 import하지 않습니다.** 순수 모듈이어야 테스트가 됩니다.

```js
// lib/engine/renderer.js
export async function createRenderer(canvas, { width, height })
//   → { drawTile, drawSprite, present, resize, setTint, destroy, backend }
//   backend: 'webgpu' | 'webgl2' | 'canvas2d'
```

- **WebGPU가 1순위**입니다. 타일과 스프라이트를 하나의 인스턴스 버퍼로 모아 **드로우콜 1회**에 그립니다.
- WGSL 셰이더가 맡는 것: 풀숲 흔들림, 물결, 시간대 색조(`setTint`), 배틀 전환 와이프.
- `navigator.gpu`가 없으면 WebGL2, 그것도 없으면 Canvas2D로 **조용히** 내려갑니다.
  세 백엔드가 **같은 그림**을 그려야 합니다. 폴백에서만 보이는 버그는 버그입니다.
- 게임 루프는 **고정 스텝 60Hz** 시뮬레이션 + 보간 렌더. 저프레임에서 이동이 어긋나지 않게.

```js
// lib/engine/input.js  — 방향키/WASD/게임패드/터치 D-pad를 한 축으로
export function createInput(el) // → { dir, confirm, cancel, run, menu, destroy }
```

```js
// lib/engine/map.js
export function parseMap(def)   // → { w, h, ground: Uint8Array, over: Uint8Array, solid: Uint8Array, ... }
```

### 접근성 / 폴백

- `prefers-reduced-motion`: 화면 흔들림·전환 이펙트를 끄고 즉시 전환합니다.
- 게임을 못 하는 사람을 위해 **`/resume` 정적 이력서 페이지**를 항상 제공합니다.
  본문은 게임과 **같은 상수**(`content/`)에서 생성되어 어긋날 사본이 없습니다.
- AEO: `/iron.md`, `/llms.txt`, JSON-LD는 3d-web-profile과 같은 방식으로 유지합니다.

---

## 9. 파일 소유권 (워커 충돌 방지)

| 소유자 | 쓰기 허용 경로 |
|---|---|
| **에셋 워커** | `public/game/**` · `docs/ASSET-REPORT.md` · `scripts/assets/**` |
| **엔진 워커** | `lib/engine/**` |
| **코디네이터** | 그 외 전부 (`app/`, `components/`, `content/`, 설정) |

---

## 10. 사실 정확성

이력 문장은 `content/wiki.js`(3d-web-profile의 `lib/wiki.js` 이식)에서만 가져옵니다.
**게임을 위해 수치를 지어내지 않습니다.** 도감 설명은 실제 이력 문장을 축약한 것이어야 하고,
`caution` 조각의 "하지 않은 일"은 게임에서도 하지 않은 일입니다.
