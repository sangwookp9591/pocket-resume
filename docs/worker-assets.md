# 워커 A — 에셋 생성

**저장소**: `/Users/iron/Project/psw/resume-pocket-mon`
**먼저 읽을 것**: `docs/GAME-CONTRACT.md` 5절(에셋 목록) · 6절(아트 규격) · 7절(예산). 그게 계약입니다.

## 쓸 수 있는 경로 (이것만)

```
public/game/**
scripts/assets/**
docs/ASSET-REPORT.md
```

**다른 파일은 절대 건드리지 마세요.** 같은 워크트리에서 다른 워커와 코디네이터가 동시에 일합니다.
`git commit`은 위 경로만 `git add`해서 하세요. `git add -A` 금지. `git push` 금지 — 코디네이터가 합니다.

## 할 일

`docs/GAME-CONTRACT.md` 5.B~5.F의 **64장**을 생성해 `public/game/` 아래에 규격대로 놓습니다.

1. `scripts/assets/manifest.js` — id → { path, w, h, prompt, model, ref?, transparent } 표를 먼저 씁니다.
   계약의 표를 그대로 옮기고 프롬프트만 채웁니다. **이 파일이 산출물의 절반입니다** — 나중에
   한 장만 다시 만들 때 이 표를 봅니다.
2. `scripts/assets/gen.mjs` — manifest를 읽어 순서대로 생성·후처리·저장하는 스크립트.
   - 이미 존재하는 결과물은 **건너뜁니다**(재실행 가능해야 합니다). `--force <id>`로 강제.
   - 실패는 최대 3회 재시도, 그 이상은 건너뛰고 리포트에 실패로 적습니다.
   - 한 장 끝날 때마다 진행 상황을 stdout에 한 줄씩.
3. 실행해서 실제 파일을 만듭니다.
4. `docs/ASSET-REPORT.md` — 생성 결과표(id · 파일 · 바이트 · 모델 · 시도횟수 · 성공/실패),
   총 소모 크레딧, 실패 목록과 이유.

## Higgsfield CLI

```bash
higgsfield account status                    # 잔액 확인. 시작 전/후 반드시
higgsfield model get nano_banana_flash --json # 파라미터 확인
higgsfield generate create nano_banana_flash --prompt "..." --wait --json
higgsfield generate create nano_banana_flash --prompt "..." --image <ref.webp> --wait --json
higgsfield generate create gpt_image_2 --prompt "..." --aspect_ratio 3:2 --wait --json
higgsfield generate create image_background_remover --image <path-or-jobid> --wait --json
```

- `--wait`를 항상 붙입니다. 결과 URL이 stdout에 나옵니다.
- 모델 단가: `nano_banana_flash` 1.5 · `gpt_image_2` 7 · `z_image` 0.15.
- **크레딧 상한 300.** 시작 잔액을 적어 두고, 100 / 200 / 280을 넘길 때마다 리포트에 기록하세요.
  280을 넘으면 남은 것을 만들지 말고 즉시 멈추고 escalation을 보내세요.

## 아잉 참조 이미지

`char/aing-*` 와 `char/prof-*`, `bg/title.webp` 는 반드시 참조 이미지를 넣습니다:

```
/Users/iron/Project/psw/3d-web-profile/public/mascot/pose/idle.webp
```

흰 고양이 · 파란 고글형 헤드밴드 · 헤드폰 · 큰 파란 눈 · 꼬리를 유지하되,
**바이저의 뇌 아이콘과 몸의 회로 무늬는 뺍니다** (계약 6절, 사이버 요소 금지).

## 후처리

`magick`도 `sharp`도 없습니다. **ffmpeg만 있습니다.** `sips`도 씁니다.

```bash
# 다운로드
curl -fsSL "<result_url>" -o scripts/assets/raw/<id>.png

# 배경 제거는 higgsfield image_background_remover를 쓰는 편이 확실합니다.
# 그래도 흰 테두리가 남으면 ffmpeg colorkey로 다듬습니다:
ffmpeg -y -i raw.png -vf "colorkey=0xFFFFFF:0.10:0.02,format=rgba" keyed.png

# 니어리스트 축소 + 무손실 WebP (투명 에셋)
ffmpeg -y -i keyed.png -vf "scale=32:48:flags=neighbor" -c:v libwebp -lossless 1 out.webp

# 배경 이미지 (불투명, 품질 82)
ffmpeg -y -i raw.png -vf "scale=512:192:flags=lanczos" -c:v libwebp -quality 82 out.webp
```

`scripts/assets/raw/`는 `.gitignore`에 이미 들어 있습니다 — 원본은 커밋되지 않습니다.

### 픽셀아트 다운스케일 주의

AI는 1024px 근처로 뱉습니다. 그대로 `neighbor`로 32px까지 줄이면 뭉개집니다.
**2단계로 줄이세요**: 먼저 `lanczos`로 목표의 4배(예: 128×192)까지, 그다음 `neighbor`로 목표(32×48)까지.
결과가 뭉개져 읽히지 않으면 그게 실패입니다 — 재시도 대상입니다.

## 품질 게이트 (스스로 판정)

한 장을 저장하기 전에 **직접 Read 도구로 열어 보고** 아래를 확인하세요. 통과 못 하면 재시도입니다.

- [ ] 글자·로고·워터마크가 없다
- [ ] 투명 에셋: 배경이 실제로 투명하고 흰 테두리가 남지 않았다
- [ ] 캐릭터: 발끝이 프레임 아래 변에 닿고, 방향(정면/후면/측면)이 요청과 맞다
- [ ] 규격대로의 픽셀 크기다
- [ ] 계약 6절 팔레트에서 크게 벗어나지 않았다
- [ ] 사이버펑크·네온·회로 무늬가 없다

## 진행 보고

- 20장마다 `orca orchestration send --subject "에셋 진행" --body "..." --type status --json`
- 다 끝나면 `worker_done`. 실패 목록과 총 크레딧을 body에 요약.
- 막히면 혼자 3번 넘게 시도하지 말고 `escalation`.
