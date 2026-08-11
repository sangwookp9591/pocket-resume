# 에셋 생성 리포트

계약: `docs/GAME-CONTRACT.md` 5.B~5.F · 6절(아트 규격) · 7절(예산)
도구: `scripts/assets/manifest.ts`(표) · `scripts/assets/gen.ts`(구동) · `scripts/assets/post.py`(후처리)

## 한 줄 결과

**65장 전부 생성 · 영구 실패 0장 · 109.0 크레딧 소모(상한 300) · 합계 470KB(상한 2.5MB).**

---

## 1. 예산

| | 값 |
|---|---:|
| 시작 잔액 | 669.5 |
| 끝 잔액 | 560.5 |
| **소모** | **109.0** |
| 계약 상한 | 300 |
| 계약 7절 예상 | ≈115 |

100 통과 시점은 아잉 재생성(3차) 직전이었고, 200·280에는 닿지 않았습니다.

실행별 내역:

| 실행 | 무엇 | 크레딧 |
|---|---|---:|
| 파이프라인 검증 | 아잉 1장 수동 생성(파이프라인 확인용, 채택 안 함) | 1.5 |
| 파일럿 | 종류별 4장 + 파생 1장으로 품질 확인 | 9.0 |
| 본 실행 | 나머지 58장 | 85.0 |
| 후처리 재실행 | 오브젝트 20장 폭 채움 — **재생성 아님** | 0 |
| 2차 수정 | 실패 8장 재생성 | 12.0 |
| 3차 수정 | `aing-side` 한 장 + 파생 2장 | 1.5 |
| | **합계** | **109.0** |

계약 7절이 잡아 둔 배경 제거 ~11크레딧은 쓰지 않았습니다(아래 3-1).

---

## 2. 결과표

`시도`는 그 파일을 만들 때 API를 부른 횟수입니다. `derive`는 다른 프레임에서 만든 것(크레딧 0),
`repost`는 원본 PNG를 다시 후처리한 것(크레딧 0)입니다.
**마지막 실행 기준입니다** — 4절의 9장은 그 전에 한 번 더 생성했습니다.

| id | 파일 | 규격 | 바이트 | 모델 | 시도 | 결과 |
|---|---|:-:|---:|---|:-:|:-:|
| `char/aing-down-2` | `char/aing-down-2.webp` | 32×48 | 2,062 | derive | 0 | ✅ |
| `char/aing-down` | `char/aing-down.webp` | 32×48 | 2,082 | nano_banana_flash | 1 | ✅ |
| `char/aing-side-2` | `char/aing-side-2.webp` | 32×48 | 2,432 | derive | 0 | ✅ |
| `char/aing-side` | `char/aing-side.webp` | 32×48 | 2,462 | nano_banana_flash | 1 | ✅ |
| `char/aing-up-2` | `char/aing-up-2.webp` | 32×48 | 1,882 | derive | 0 | ✅ |
| `char/aing-up` | `char/aing-up.webp` | 32×48 | 1,902 | nano_banana_flash | 1 | ✅ |
| `char/hero-down-2` | `char/hero-down-2.webp` | 32×48 | 1,300 | derive | 0 | ✅ |
| `char/hero-down` | `char/hero-down.webp` | 32×48 | 1,318 | nano_banana_flash | 1 | ✅ |
| `char/hero-side-2` | `char/hero-side-2.webp` | 32×48 | 1,110 | derive | 0 | ✅ |
| `char/hero-side` | `char/hero-side.webp` | 32×48 | 1,122 | nano_banana_flash | 1 | ✅ |
| `char/hero-up-2` | `char/hero-up-2.webp` | 32×48 | 1,162 | derive | 0 | ✅ |
| `char/hero-up` | `char/hero-up.webp` | 32×48 | 1,180 | nano_banana_flash | 1 | ✅ |
| `char/npc-ace-down` | `char/npc-ace-down.webp` | 32×48 | 1,088 | nano_banana_flash | 1 | ✅ |
| `char/npc-junior-down` | `char/npc-junior-down.webp` | 32×48 | 1,758 | nano_banana_flash | 1 | ✅ |
| `char/npc-lead-down` | `char/npc-lead-down.webp` | 32×48 | 1,758 | nano_banana_flash | 1 | ✅ |
| `char/npc-nurse-down` | `char/npc-nurse-down.webp` | 32×48 | 1,628 | nano_banana_flash | 1 | ✅ |
| `char/npc-senior-down` | `char/npc-senior-down.webp` | 32×48 | 1,562 | nano_banana_flash | 1 | ✅ |
| `char/prof-down` | `char/prof-down.webp` | 32×48 | 2,554 | nano_banana_flash | 1 | ✅ |
| `mon/ainews` | `mon/ainews.webp` | 96×96 | 9,596 | nano_banana_flash | 1 | ✅ |
| `mon/archunit` | `mon/archunit.webp` | 96×96 | 6,386 | nano_banana_flash | 1 | ✅ |
| `mon/aws` | `mon/aws.webp` | 96×96 | 6,858 | nano_banana_flash | 1 | ✅ |
| `mon/fsd` | `mon/fsd.webp` | 96×96 | 10,354 | nano_banana_flash | 1 | ✅ |
| `mon/insight` | `mon/insight.webp` | 96×96 | 8,030 | nano_banana_flash | 1 | ✅ |
| `mon/java` | `mon/java.webp` | 96×96 | 9,914 | nano_banana_flash | 1 | ✅ |
| `mon/javascript` | `mon/javascript.webp` | 96×96 | 9,718 | nano_banana_flash | 1 | ✅ |
| `mon/jpa` | `mon/jpa.webp` | 96×96 | 8,208 | nano_banana_flash | 1 | ✅ |
| `mon/nextjs` | `mon/nextjs.webp` | 96×96 | 8,064 | nano_banana_flash | 1 | ✅ |
| `mon/opensearch` | `mon/opensearch.webp` | 96×96 | 8,204 | nano_banana_flash | 1 | ✅ |
| `mon/outbox` | `mon/outbox.webp` | 96×96 | 5,504 | nano_banana_flash | 1 | ✅ |
| `mon/playwright` | `mon/playwright.webp` | 96×96 | 8,472 | nano_banana_flash | 1 | ✅ |
| `mon/rbac` | `mon/rbac.webp` | 96×96 | 9,778 | nano_banana_flash | 1 | ✅ |
| `mon/react` | `mon/react.webp` | 96×96 | 6,796 | nano_banana_flash | 1 | ✅ |
| `mon/reactnative` | `mon/reactnative.webp` | 96×96 | 9,604 | nano_banana_flash | 1 | ✅ |
| `mon/resilience` | `mon/resilience.webp` | 96×96 | 10,256 | nano_banana_flash | 1 | ✅ |
| `mon/spring` | `mon/spring.webp` | 96×96 | 6,854 | nano_banana_flash | 1 | ✅ |
| `mon/springboot` | `mon/springboot.webp` | 96×96 | 6,782 | nano_banana_flash | 1 | ✅ |
| `mon/sql` | `mon/sql.webp` | 96×96 | 6,624 | nano_banana_flash | 1 | ✅ |
| `mon/vanilla` | `mon/vanilla.webp` | 96×96 | 7,292 | nano_banana_flash | 1 | ✅ |
| `mon/webgpu` | `mon/webgpu.webp` | 96×96 | 9,510 | nano_banana_flash | 1 | ✅ |
| `obj/bld-cafe` | `obj/bld-cafe.webp` | 96×64 | 7,700 | nano_banana_flash | 1 | ✅ |
| `obj/bld-gym` | `obj/bld-gym.webp` | 128×96 | 16,450 | repost | 0 | ✅ |
| `obj/bld-house` | `obj/bld-house.webp` | 96×64 | 8,556 | repost | 0 | ✅ |
| `obj/bld-lab` | `obj/bld-lab.webp` | 128×96 | 15,432 | repost | 0 | ✅ |
| `obj/bld-office-1` | `obj/bld-office-1.webp` | 128×96 | 16,558 | repost | 0 | ✅ |
| `obj/bld-office-2` | `obj/bld-office-2.webp` | 128×96 | 18,058 | repost | 0 | ✅ |
| `obj/bld-office-3` | `obj/bld-office-3.webp` | 128×96 | 16,122 | repost | 0 | ✅ |
| `obj/bld-tower` | `obj/bld-tower.webp` | 160×128 | 26,302 | nano_banana_flash | 1 | ✅ |
| `obj/bush` | `obj/bush.webp` | 32×32 | 1,888 | repost | 0 | ✅ |
| `obj/campfire` | `obj/campfire.webp` | 32×32 | 1,568 | repost | 0 | ✅ |
| `obj/desk` | `obj/desk.webp` | 64×32 | 2,546 | nano_banana_flash | 1 | ✅ |
| `obj/fence` | `obj/fence.webp` | 32×32 | 1,190 | repost | 0 | ✅ |
| `obj/flower` | `obj/flower.webp` | 32×32 | 1,702 | repost | 0 | ✅ |
| `obj/lamp` | `obj/lamp.webp` | 32×64 | 794 | repost | 0 | ✅ |
| `obj/mailbox` | `obj/mailbox.webp` | 32×32 | 1,464 | repost | 0 | ✅ |
| `obj/rock` | `obj/rock.webp` | 32×32 | 1,808 | repost | 0 | ✅ |
| `obj/shelf` | `obj/shelf.webp` | 32×64 | 3,828 | repost | 0 | ✅ |
| `obj/sign` | `obj/sign.webp` | 32×32 | 1,358 | repost | 0 | ✅ |
| `obj/tree-small` | `obj/tree-small.webp` | 32×32 | 1,966 | repost | 0 | ✅ |
| `obj/tree` | `obj/tree.webp` | 64×64 | 4,658 | repost | 0 | ✅ |
| `bg/battle-1` | `bg/battle-1.webp` | 512×192 | 24,980 | nano_banana_flash | 1 | ✅ |
| `bg/battle-2` | `bg/battle-2.webp` | 512×192 | 18,642 | nano_banana_flash | 1 | ✅ |
| `bg/battle-3` | `bg/battle-3.webp` | 512×192 | 25,996 | nano_banana_flash | 1 | ✅ |
| `bg/battle-4` | `bg/battle-4.webp` | 512×192 | 10,578 | nano_banana_flash | 1 | ✅ |
| `bg/battle-5` | `bg/battle-5.webp` | 512×192 | 21,100 | nano_banana_flash | 1 | ✅ |
| `bg/title` | `bg/title.webp` | 512×352 | 26,942 | gpt_image_2 | 1 | ✅ |

**실패로 남은 것: 없습니다.**

종류별 합계:

| 종류 | 장수 | 용량 |
|---|:-:|---:|
| 캐릭터 `char/` | 18 | 30KB |
| 기술몬 `mon/` | 21 | 169KB |
| 건물·오브젝트 `obj/` | 20 | 146KB |
| 배경 `bg/` | 6 | 125KB |
| **합계** | **65** | **470KB** |

배경 한 장 최대 26KB (계약 상한 120KB), 전체 470KB (상한 2.5MB).

---

## 3. 계약과 다르게 간 것 — 네 가지

### 3-1. 배경 제거를 `image_background_remover` 대신 마젠타 크로마키로

계약 6절은 "흰 배경으로 뽑고 `image_background_remover`로 빼라"고 합니다.
그런데 이 팔레트는 cream `#F4F1EA`가 거의 흰색이라 흰 배경과 붙습니다.

배경을 `#FF00FF`로 시키면 계약 6절 팔레트의 **어느 색과도 겹치지 않습니다**:

| 색 | R,G,B | 배경 판정 규칙에 걸리는가 |
|---|---|---|
| blush `#F5C6D0` | 245,198,208 | G=198 > 120 → 안 걸림 |
| lavender `#B8B0E8` | 184,176,232 | G=176 > 120 → 안 걸림 |
| indigo `#2E2A6B` | 46,42,107 | R=46 < 170 → 안 걸림 |

`post.py`가 두 규칙으로 뺍니다 — 배경 자체(`R>170 and B>170 and G<120`)와
경계에 번진 마젠타(`min(R,B) > G+45`). **크레딧 ~11과 왕복 59번을 아꼈고, 흰 테두리가 남지 않습니다.**

### 3-2. 걷기 2프레임(`-2` 6장)은 생성하지 않고 파생

계약 5.B는 `-2` 프레임이 "다리만 다르게, **위치·크기 동일**"이어야 한다고 합니다.
32×48에서 2% 스케일 차이는 1px 떨림이 되고, AI 재생성으로는 이 조건을 지킬 수 없습니다.

`post.py --derive`가 1프레임에서 만듭니다: **아래 5줄(발)을 고정하고 몸통만 1px 내립니다.**
한 걸음 밟은 것처럼 보이고, 위치·크기는 정의상 동일합니다. 크레딧 0.

### 3-3. 캐릭터 18장 · 기술몬 21종 (계약 표기는 "캐릭터 21 · 기술몬 18")

계약 5.B의 **파일 표**를 세면 18장(hero 6 · aing 6 · prof 1 · npc 5)이고,
5.C의 **id 목록**을 세면 18개인데 `content/mons.js`에는 스타터 `java`·`javascript`·`sql`이
더 있어 21종입니다. 숫자가 뒤바뀐 것으로 보고 **파일 표와 실제 id 목록**을 따랐습니다.

합계는 어느 쪽이든 **65장**이라 7절 예산표(65개)와 맞습니다.
스타터 3종을 안 만들었으면 게임의 첫 화면(스타터 선택)이 자리표시자로 떴을 것입니다.

### 3-4. 후처리를 ffmpeg가 아니라 Pillow로

워커 브리프는 "`magick`도 `sharp`도 없고 ffmpeg만 있다"고 했지만, 이 ffmpeg 빌드에는
**libwebp 인코더가 없고**(`Unknown encoder 'libwebp'`) `sips`는 webp를 읽기만 하고 쓰지 못합니다.
시스템 `python3`에 Pillow 12.2가 이미 있어서 그걸 씁니다 — **설치한 것 없습니다.**

Pillow가 2단계 축소(lanczos로 목표의 4배 → nearest로 목표)까지 같이 하므로 파이프라인이 한 단계 짧아졌습니다.

---

## 4. 품질 게이트에서 걸러낸 것 — 재생성 9장

기계 게이트(규격 일치 · 불투명 픽셀 비율 5~98.5%)는 65장 전부 1차 통과했습니다.
아래는 **눈으로 보고** 되돌린 것들입니다.

| 대상 | 무엇이 틀렸나 | 어떻게 고쳤나 |
|---|---|---|
| `bg/battle-3` | 선체에 **`SEA DRAGON`** 글자 | 공통 `no text`로 부족 → "선체는 완전히 비어 있다, 배 이름 없음"을 프롬프트에 직접 |
| `bg/battle-5` | 헬리패드에 **`H`** — 글자입니다 | "원 안은 완전히 비어 있다, 글자 없음" |
| `char/aing-up` | 뒷모습이 아니라 정면. 색도 하늘색으로 갈림 | ① `aing-down`의 **원본 PNG**를 참조로 연결 ② "얼굴이 완전히 가려진다"를 세 번 다르게 서술 |
| `char/aing-side` | 정측면이 아니라 3/4. 비율도 갈림 | 위와 같은 참조 + **2차에도 정면으로 나와** 3차에 "코가 왼쪽 가장자리를 가리킨다"는 기하 서술로 교정 |
| `char/prof-down` | 통과했지만 `aing-down`과 색·비율이 달랐음 | 같은 캐릭터라 참조를 연결해 통일 |
| `obj/bld-tower` | 타일 발자국 폭의 **49%**만 채움 | "높은 탑" 대신 "넓고 낮은 5층 블록, 프레임 좌우를 가득" |
| `obj/desk` | **50%** | "깊이의 두 배로 긴 책상" |
| `obj/bld-cafe` | **68%** | "넓고 낮은 카페, 프레임 폭을 가득" |
| 오브젝트 20장 전부 | 비율대로만 맞추니 발자국 폭이 남음 | `post.py --stretch 1.4` — 아래 5절 |

`char/aing-side`는 3차에도 완전한 정측면은 아닙니다(고양이 얼굴을 모델이 자꾸 정면으로 돌립니다).
**왼쪽을 보고 있고 색·비율이 나머지 두 방향과 같다**는 선에서 채택했습니다.
정측면이 꼭 필요하면 `node scripts/assets/gen.ts --force char/aing-side char/aing-side-2`로 다시 굴리면 됩니다.

---

## 5. 타일 발자국 폭 문제 (기록해 둘 것)

비율을 지켜 상자 안에 맞추면 오브젝트가 자기 타일 발자국을 다 못 채웁니다.
4타일짜리 건물이 3타일만 차지하면 **옆구리에 안 보이는 벽**이 생깁니다 —
`lib/game/draw.js`는 충돌을 `w×h` 타일 전체에 채우기 때문입니다.

그래서 오브젝트만 `stretch: 1.4`까지 가로로 늘려 폭을 채웁니다(계약 5.D: "폭은 타일 배수").
캐릭터·기술몬은 `stretch: 1`입니다 — 사람을 옆으로 늘리면 바로 티가 납니다.

고친 뒤 폭 충전율:

| | 값 |
|---|---|
| 20장 중 19장 | **80% 이상** |
| `obj/lamp` | 34% — 가는 가로등 기둥이라 정상입니다 |

---

## 6. 다시 만드는 법

```bash
node scripts/assets/gen.ts                          # 없는 것만
node scripts/assets/gen.ts --force mon/react        # 한 장만 다시
node scripts/assets/gen.ts --repost --only obj/     # 크레딧 0, 후처리만 다시
node scripts/assets/gen.ts --dry                    # 크레딧 예상만
```

- `scripts/assets/manifest.ts`가 표입니다. 프롬프트를 고치고 `--force`하면 그 장만 바뀝니다.
- 원본 PNG는 `scripts/assets/raw/`에 남습니다(`.gitignore` 대상). 있으면 `--repost`가 공짜입니다.
- 상한은 스크립트에 박혀 있습니다: **280에 닿으면 남은 것을 시작하지 않고 멈춥니다.**
- `refFrom`이 걸린 장(`char/aing-up`·`aing-side`·`prof-down`)은 `char/aing-down`의 원본 PNG를
  참조로 쓰므로 그 원본이 `raw/`에 없으면 `aing-down`부터 다시 만들어야 합니다.

---

## 7. 만들지 않은 것

- **지면 타일 8종** — 계약 5.A대로 `lib/engine/tilegen.js`가 절차 생성합니다. 크레딧 0.
- **실내 구조물**(`wall`·`window`·`counter`·`door`·`stairs`) — 타일 격자에 딱 맞아야 해서
  `lib/game/assets.js`가 코드로 그립니다. AI 생성물은 격자에 안 맞습니다.
- **파티클·HP바·대화창·폰트·UI 프레임·낮밤 색조** — 계약 5절 "만들지 않는 것"대로 전부 코드입니다.
- **외부 CC0 팩**(Ninja Adventure) — AI 3연속 실패한 장이 없어 한 장도 쓰지 않았습니다.
  따라서 `docs/CREDITS.md`에 적을 출처가 없습니다.

---

## 8. 남은 위험

- `char/aing-side`가 완전한 정측면이 아닙니다(4절 참고). 걷는 동안 얼굴이 살짝 정면입니다.
- `obj/bld-gym`은 "돌기둥 체육관"보다 목조 건물에 가깝게 나왔습니다. 기계 게이트는 통과했고
  화면에서 건물로 읽히지만, 계약 5.D의 서술과는 조금 다릅니다.
- 걷기 2프레임이 다리 교대가 아니라 몸통 1px 상하입니다(3-2). 속도가 붙으면 걸음으로 읽히지만
  HGSS의 다리 교대와 같지는 않습니다. 다리 교대가 필요하면 프레임당 생성이 아니라
  `post.py`의 `frame2()`를 고치는 쪽이 맞습니다 — 위치·크기가 어긋나지 않아야 하니까요.
