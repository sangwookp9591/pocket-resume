# 크레딧 · 출처

## 만든 것

| 항목 | 어떻게 |
|---|---|
| 지면 타일 59종 (잔디·흙길·물·돌바닥·모래·마루·카펫·다리 + 오토타일 엣지 16종 × 3쌍) | **코드 절차 생성** (`lib/engine/tilegen.js`). AI도 외부 팩도 쓰지 않았습니다 — seamless를 보장하는 유일한 방법입니다 |
| 캐릭터 스프라이트 · 기술몬 18종 · 건물/오브젝트 · 배틀 배경 · 타이틀 | Higgsfield AI 생성 (`gpt_image_2` / `nano_banana_flash`). 프롬프트와 결과는 `scripts/assets/manifest.js`와 `docs/ASSET-REPORT.md`에 |
| 실내 구조물 (벽·창·문·계단·카운터) | **코드 절차 생성** (`lib/game/assets.js`). 타일 격자에 딱 맞아야 해서 AI에 시키지 않았습니다 |
| 대화창·HP바·도감·메뉴·전환 연출 | 전부 CSS/DOM. 이미지 에셋 0장 |
| 마스코트 Ai-ng(아잉) | 원작자 본인. 픽셀판은 [3d-web-profile](https://github.com/sangwookp9591)의 `public/mascot/pose/idle.webp`를 참조 이미지로 넣어 생성 |

## 검토했지만 쓰지 않은 것

### Ninja Adventure Asset Pack — CC0

- 출처: [itch.io](https://pixel-boy.itch.io/ninja-adventure-asset-pack) · [github](https://github.com/pixel-boy/NinjaAdventure)
- 라이선스: **CC0** (저작자 표시 불요, 상업 이용 가능)
- 처음 계획은 이 팩의 16×16 나무·집·울타리를 1순위로 쓰는 것이었습니다.
- **쓰지 않은 이유**: 절차 타일이 32px 네이티브로 나왔고, 그 위에 16×16을 2배 확대한 오브젝트를
  얹으면 픽셀 크기가 2×2와 1×1로 갈려 한 화면에서 바로 티가 납니다. 바닥이 화면의 전부라
  바닥에 맞추는 쪽을 골랐습니다.
- 현재 상태: **폴백**. AI가 한 오브젝트를 3번 실패하면 그때만 이 팩에서 잘라 씁니다.
  한 장이라도 쓰게 되면 이 문서에 파일명과 잘라 온 좌표를 적습니다.

> CC0는 표시 의무가 없습니다. 그래도 적어 둡니다 — 의무가 없는 것과 출처를 숨기는 것은 다른 문제입니다.

## 쓰지 않은 것 (의도적으로)

- **닌텐도/포켓몬의 실제 스프라이트, 타일, 폰트, 음원.** 한 조각도 쓰지 않았습니다.
- **포켓몬 디컴파일 프로젝트**(pret/pokeemerald, pokered, porytiles 등)의 타일·팔레트.
  CC0로 공개된 저장소라도 그 안의 아트는 닌텐도 자산입니다.
- 이 사이트는 공개 이력서입니다. IP 리스크를 지지 않습니다.
  **빌린 것은 문법뿐입니다** — 4방향 그리드 이동, 풀숲 인카운터, 턴제 배틀, 도감, 배지.
  그 문법은 저작권의 대상이 아닙니다.

## 기술

Next.js 16.3 App Router · React 19 · WebGPU(WGSL) — WebGL2 · Canvas2D 폴백.
외부 렌더링 라이브러리 없음. 런타임 의존성은 `next` · `react` · `react-dom` 셋뿐입니다.
