#!/usr/bin/env python3
"""AI 원본(1024px 근처) → 계약 규격의 WebP.

브리프는 "ffmpeg만 있다"고 했지만 이 ffmpeg 빌드에는 libwebp 인코더가 없고
(`Unknown encoder 'libwebp'`), sips는 webp를 읽기만 하고 쓰지 못합니다.
Pillow 12.2가 시스템 python3에 이미 있어서 그걸 씁니다 — 설치한 것 없음.

파이프라인 (계약 6절):
  1) 마젠타 크로마키 제거 + 디스필    (투명 에셋만)
  2) 알파 bbox로 트림                 (AI가 넣은 여백을 버려야 발끝이 아래 변에 닿음)
  3) lanczos로 목표의 4배까지         ← 2단계 축소. 한 번에 줄이면 뭉갭니다
  4) nearest로 목표까지
  5) 목표 상자에 패딩 (아래 정렬/가운데 정렬)
"""

import argparse
import sys

from PIL import Image

# 크로마키. 프롬프트가 배경을 마젠타(#FF00FF)로 시킵니다.
# 계약 6절 팔레트 중 마젠타에 가까운 색이 없어서 이 두 규칙은 안전합니다:
#   blush #F5C6D0(245,198,208) · lavender #B8B0E8(184,176,232) · indigo #2E2A6B(46,42,107)
#   셋 다 아래 두 조건에 걸리지 않습니다.
KEY_MIN = 170   # 배경 판정: R,B가 이보다 크고
KEY_MAX_G = 120  # G가 이보다 작으면 배경
SPILL = 45       # 잔여 물듦: min(R,B) > G+SPILL 이면 경계의 마젠타 번짐


def dekey(im):
    """마젠타 배경과 경계 번짐을 투명으로."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if (r > KEY_MIN and b > KEY_MIN and g < KEY_MAX_G) or (min(r, b) > g + SPILL):
                px[x, y] = (0, 0, 0, 0)
    return im


def trim(im):
    """알파 bbox로 자릅니다. 없으면(전부 투명) 원본 그대로."""
    box = im.getbbox()
    return im.crop(box) if box else im


def target(im, w, h, stretch):
    """w×h 상자 안에 넣을 최종 크기.

    비율대로 맞추면 오브젝트가 자기 타일 발자국을 다 못 채웁니다 —
    4타일짜리 건물이 3타일만 차지하면 옆구리에 안 보이는 벽이 생깁니다.
    그래서 오브젝트만 stretch배까지 가로로 늘려 폭을 채웁니다(계약 5.D: 폭은 타일 배수).
    캐릭터·기술몬은 stretch=1 — 사람을 옆으로 늘리면 바로 티가 납니다.
    """
    s = min(w / im.width, h / im.height)
    fw, fh = im.width * s, im.height * s
    if stretch > 1:
        fw = min(w, fw * stretch)
    return max(1, round(fw)), max(1, round(fh))


def place(im, w, h, align):
    """w×h 투명 상자에 얹습니다. bottom이면 발끝이 아래 변에 닿습니다."""
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    x = (w - im.width) // 2
    y = h - im.height if align == 'bottom' else (h - im.height) // 2
    out.paste(im, (x, y))
    return out


def frame2(im):
    """걷기 2프레임을 1프레임에서 만듭니다.

    따로 생성하면 위치·크기가 미묘하게 달라 스프라이트가 떱니다 —
    계약 5.B가 요구하는 "위치·크기 동일"은 파생으로만 지킬 수 있습니다.
    발은 고정하고 몸통만 1px 내려서 한 걸음을 밟은 것처럼 보이게 합니다.
    """
    w, h = im.size
    legs = h - 5  # 아래 5줄 = 발. 그대로 둡니다
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(im.crop((0, 0, w, legs)), (0, 1))
    out.paste(im.crop((0, legs, w, h)), (0, legs), im.crop((0, legs, w, h)))
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--src', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--w', type=int, required=True)
    p.add_argument('--h', type=int, required=True)
    p.add_argument('--mode', choices=['cutout', 'opaque'], default='cutout')
    p.add_argument('--align', choices=['bottom', 'center'], default='bottom')
    p.add_argument('--stretch', type=float, default=1.0, help='폭을 채우기 위한 가로 확대 상한')
    p.add_argument('--derive', action='store_true', help='src를 걷기 2프레임으로 변형 (축소 없음)')
    a = p.parse_args()

    im = Image.open(a.src).convert('RGBA')

    if a.derive:
        frame2(im).save(a.out, lossless=True)
        return report(Image.open(a.out))

    if a.mode == 'opaque':
        # 배경은 잘라내지 않고 정확한 규격으로 늘립니다. 화면을 꽉 채워야 하니까요.
        im.convert('RGB').resize((a.w, a.h), Image.LANCZOS).save(a.out, quality=82, method=6)
        return report(Image.open(a.out))

    im = trim(dekey(im))
    tw, th = target(im, a.w, a.h, a.stretch)
    im = im.resize((tw * 4, th * 4), Image.LANCZOS)  # 2단계 축소: 먼저 목표의 4배까지
    im = im.resize((tw, th), Image.NEAREST)          # 그다음 니어리스트로 목표까지
    # 니어리스트 축소가 만든 반투명 픽셀을 이진화합니다 — 안 하면 확대 시 흐린 테두리가 생깁니다.
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, al = px[x, y]
            if al:
                px[x, y] = (r, g, b, 255 if al > 96 else 0)
    place(im, a.w, a.h, a.align).save(a.out, lossless=True)
    report(Image.open(a.out))


def report(im):
    """gen.mjs가 품질 게이트에 쓰는 한 줄. 불투명 픽셀 비율이 핵심입니다 —
    0에 가까우면 키가 다 먹었고, 1이면 키가 하나도 안 먹은 것(둘 다 실패)."""
    im = im.convert('RGBA')
    a = im.getchannel('A')
    opaque = sum(c for v, c in zip(range(256), a.histogram()) if v > 200)
    print('{"w":%d,"h":%d,"fill":%.4f}' % (im.width, im.height, opaque / (im.width * im.height)))


if __name__ == '__main__':
    sys.exit(main())
