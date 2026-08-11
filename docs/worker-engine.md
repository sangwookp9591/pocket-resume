# 워커 B — 렌더링 엔진

**저장소**: `/Users/iron/Project/psw/resume-pocket-mon`
**먼저 읽을 것**: `docs/GAME-CONTRACT.md` 3절(화면 규격) · 4절(맵 포맷) · 5.A(절차 타일) · 8절(엔진 계약).

## 쓸 수 있는 경로 (이것만)

```
lib/engine/**
test/engine/**
```

**다른 파일은 절대 건드리지 마세요.** 같은 워크트리에서 에셋 워커와 코디네이터가 동시에 일합니다.
`git add`는 위 경로만. `git add -A` 금지. `git push` 금지 — 코디네이터가 합니다.

## 할 일

React를 import하지 않는 순수 모듈 6개. 게임 로직도 씬도 여기 없습니다 — **그리는 것과 읽는 것**만입니다.

### 1. `lib/engine/renderer.js`

```js
export async function createRenderer(canvas, { width, height })
// → {
//     backend,                                   // 'webgpu' | 'webgl2' | 'canvas2d'
//     addTexture(key, imageBitmapOrCanvas),      // 아틀라스 등록
//     begin(camX, camY),                         // 프레임 시작 + 카메라(픽셀 단위, 소수 허용)
//     draw(key, sx, sy, sw, sh, dx, dy, dw, dh, opts),  // opts: { flipX, depth, sway, alpha }
//     present(),                                 // 정렬 후 1드로우콜
//     setTint(rgba, strength),                   // 시간대 색조
//     setWipe(kind, t),                          // 배틀 전환. kind: 'none'|'spiral'|'split'|'fade'
//     resize(w, h), destroy(),
//   }
```

- **WebGPU 1순위.** 인스턴스 버퍼 하나에 모아 `draw` 호출 수와 무관하게 **드로우콜 1회**.
  정렬 키는 `depth` → y좌표 순. WGSL로 씁니다.
- `sway`가 참인 인스턴스는 정점 셰이더에서 시간에 따라 윗변만 좌우로 흔듭니다 (풀숲·나무).
- `setTint`는 프래그먼트에서 곱하기+더하기 색조. 6개 시간대 프리셋은
  `lib/engine/palette.js`가 내보냅니다.
- `setWipe`는 풀스크린 후처리. `spiral`은 포켓몬식 소용돌이 전환입니다.
- WebGL2 폴백은 같은 인터페이스로 인스턴싱(ANGLE_instanced_arrays 아님, WebGL2 기본 기능).
  Canvas2D 폴백은 sway/wipe를 CSS로 근사하되 **같은 그림**이 나와야 합니다.
- 컨텍스트 로스트(`device.lost`, `webglcontextlost`)를 처리해 복구하세요. 조용히 검은 화면 금지.

### 2. `lib/engine/tilegen.js`

계약 5.A. 지면 타일을 **코드로 그려** 아틀라스 캔버스 한 장으로 굽습니다.

```js
export function bakeTileAtlas() // → { canvas, uv: { grass: [x,y,w,h], ... } }
```

- 타일 32×32. `grass` · `grass-dark` · `path` · `stone` · `sand` · `water`(3프레임) ·
  `floor` · `carpet` · `bridge`.
- **오토타일 엣지**도 코드가 그립니다: 잔디↔길, 잔디↔모래, 물가. 4비트 이웃 마스크 16종.
  이게 있어야 맵이 격자무늬로 안 보입니다.
- 결정적(deterministic)이어야 합니다 — 같은 시드면 같은 그림. `Math.random()` 금지, 씨드 PRNG 사용.
- 팔레트는 계약 6절 그대로.

### 3. `lib/engine/map.js`

계약 4절의 ASCII 맵을 파싱합니다.

```js
export function parseMap(def)
// → { id, w, h, ground: Uint8Array, over: Uint8Array, solid: Uint8Array,
//     warps, npcs, encounters, events, legend }
```

- 두 레이어의 행·열 수가 다르면 **던집니다**. 메시지에 "몇 번째 줄이 몇 칸인지" 반드시 포함.
  조용히 빈 맵이 되지 않게 합니다.
- 대문자 = 충돌, 소문자 = 통과 (계약 4.1). NPC가 선 칸도 `solid`에 올립니다.
- 여러 타일을 차지하는 건물(`H`)은 legend에서 크기를 받아 좌상단 기준으로 충돌을 채웁니다.

### 4. `lib/engine/input.js`

```js
export function createInput(el)
// → { dir, dirHeld, confirm, cancel, run, menu, consume(), destroy() }
```

- 방향키 · WASD · 게임패드(d-pad + 좌스틱) · 터치 가상 D-pad를 **한 축**으로 모읍니다.
- `confirm` = Enter/Space/Z/A버튼, `cancel` = Esc/X/B버튼, `run` = Shift, `menu` = Tab.
- 키 반복(`repeat`)은 무시하고 **눌린 상태**를 직접 관리합니다. 대각선 입력은 마지막 축 우선.
- `blur`에서 모든 키를 놓습니다 — 탭 전환 후 계속 걷는 버그의 원인입니다.

### 5. `lib/engine/loop.js`

```js
export function createLoop({ update, render })
// → { start, stop, running }
```

**고정 스텝 60Hz 시뮬레이션 + 보간 렌더.** 누적 시간이 250ms를 넘으면 잘라 버립니다
(탭이 백그라운드였다가 돌아왔을 때 200프레임을 한 번에 돌리지 않게).

### 6. `lib/engine/palette.js`

계약 6절 팔레트 상수와 시간대 6종(`dawn`·`morning`·`noon`·`afternoon`·`dusk`·`night`)의
tint 프리셋. HGSS는 시간대에 따라 색이 바뀝니다 — 그걸 씁니다.

## 검증

`test/engine/` 아래에 `node --test`로 도는 테스트를 남깁니다. **프레임워크 추가 금지.**
브라우저 API가 필요한 것은 테스트하지 말고, 순수한 것만 테스트하세요:

- `parseMap`: 정상 맵 · 행 길이 불일치가 던지는지 · 충돌 마스크 · 다중타일 건물
- `tilegen`: 같은 시드 → 같은 픽셀(해시 비교) · uv 표가 모든 타일을 덮는지
- `loop`: 누적 시간 클램프

`npm run check`로 돌아야 합니다.

## 하지 않을 것

- 씬·게임 상태·대사·배틀 로직 — 코디네이터 몫입니다.
- React 컴포넌트 — 하나도 만들지 마세요.
- 에셋 로딩 정책·프리로더 — 코디네이터 몫입니다. 엔진은 `addTexture`만 받습니다.
- three.js 등 렌더링 라이브러리 추가 — **금지**. WebGPU/WebGL2를 직접 씁니다.

## 진행 보고

- 모듈 하나 끝날 때마다 `orca orchestration send --type status`.
- 다 끝나면 `worker_done`. body에 백엔드 3종 동작 여부와 테스트 결과 요약.
- 막히면 3번 넘게 혼자 시도하지 말고 `escalation`.
