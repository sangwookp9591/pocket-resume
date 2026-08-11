/* 에셋 표 — 계약(docs/GAME-CONTRACT.md) 5.B~5.F를 그대로 옮기고 프롬프트를 채운 것.

   나중에 한 장만 다시 만들 때 여기를 봅니다:
       node scripts/assets/gen.mjs --force mon/react

   ── 계약과 다르게 간 곳 세 군데. 이유를 여기 남깁니다 ──────────────────

   1) **배경 제거를 image_background_remover 대신 마젠타 크로마키로.**
      계약 6절은 "흰 배경으로 뽑고 image_background_remover로 빼라"고 합니다.
      그런데 이 팔레트는 cream #F4F1EA가 거의 흰색이라 흰 배경과 붙습니다.
      배경을 #FF00FF로 시키면 팔레트 어느 색과도 겹치지 않아 post.py가
      공짜로·확실하게 뺍니다. 크레딧 ~12와 왕복 58번을 아꼈습니다.

   2) **걷기 2프레임(`-2`)은 생성하지 않고 1프레임에서 파생합니다.**
      계약 5.B가 "위치·크기 동일"을 요구하는데, 32×48에서 2% 스케일 차이가
      1px 떨림이 됩니다. 따로 생성해서는 지킬 수 없는 조건입니다.
      post.py --derive 가 발을 고정한 채 몸통만 1px 내립니다. 크레딧 0.

   3) **기술몬 21종 · 캐릭터 18장.** 계약은 "캐릭터 21 · 기술몬 18"이라 적었지만
      5.B의 파일 표를 세면 18장이고, 5.C의 id를 세면 18개인데
      content/mons.js(코디네이터 소유)에는 스타터 java·javascript·sql이 더 있어 21종입니다.
      숫자가 뒤바뀐 것으로 보고 **파일 표와 실제 id 목록**을 따랐습니다.
      합계는 어느 쪽이든 65장이라 7절 예산표와 맞습니다. */

/** 계약 6절. 모든 프롬프트 공통. */
export const STYLE =
  '16-bit pixel art, Nintendo DS Pokemon HeartGold overworld style, ' +
  'crisp readable pixels, limited palette, soft 3-tone shading, subtle dark outline, ' +
  'slight top-down 3/4 perspective, no text, no letters, no numbers, no logo, no watermark, ' +
  'no cyberpunk, no neon, no hologram, no circuit pattern, no photorealism, ' +
  'palette: soft ice blue #A8DDF0, lavender #B8B0E8, cream #F4F1EA, deep indigo ink #2E2A6B, ' +
  'blush #F5C6D0, moss #7FA65C, pine #3E6B4A, bark #7A5A42, soil #5C4433, dusk #E8A87C, ember #F2814F';

/** 투명이 필요한 에셋 뒤에 붙습니다. 흰색이 아니라 마젠타인 이유는 파일 맨 위 1번. */
export const CUTOUT =
  ', plain flat solid magenta #FF00FF background, isolated single subject, centered, ' +
  'no ground shadow, no props, nothing else in frame';

/** 아잉이 나오는 에셋의 참조 이미지 (계약 6절). */
export const REF_AING = '/Users/iron/Project/psw/3d-web-profile/public/mascot/pose/idle.webp';

/* 아잉 생김새. 참조 이미지에서 사이버 요소만 뺀 서술 — 계약 6절이 명시적으로 요구합니다. */
const AING =
  'a small chibi white cat mascot with a plain blue goggle-style headband on the forehead, ' +
  'plain blue headphones over the ears, big round blue eyes, pink cheeks, a fluffy curled tail, ' +
  'no brain icon, no patterns on the body';

const HERO =
  'a young man with short straight black hair, wearing a grey hooded zip-up jacket, ' +
  'dark blue jeans and a small backpack';

/* 캐릭터 3방향. side는 반드시 왼쪽을 봅니다 — 오른쪽은 엔진이 반전합니다(계약 5.B).

   up·side는 1차 생성에서 아잉이 정면으로 나왔습니다("back view"만으로는 부족).
   그래서 "얼굴이 하나도 안 보인다"를 여러 번 다르게 말합니다. */
const VIEW = {
  down: 'standing and facing the viewer, front view, whole body visible from head to feet',
  up: 'viewed from directly behind, we see only the back of the head and the back of the body, ' +
    'the face is completely hidden, no eyes and no face are visible at all, ' +
    'whole body visible from head to feet',
  side: 'turned exactly ninety degrees to the left so we see a strict side profile, ' +
    'only one eye is visible, facing left, whole body visible from head to feet',
};

const char = (name, dir, who, ref, refFrom) => ({
  id: `char/${name}-${dir}`,
  path: `public/game/char/${name}-${dir}.webp`,
  w: 32, h: 48, ar: '2:3', model: 'nano_banana_flash',
  transparent: true, align: 'bottom', ref, refFrom,
  subject: `a single full-body character sprite of ${who}, ${VIEW[dir]}`,
});

/** 1프레임에서 파생되는 걷기 2프레임. 생성하지 않습니다. */
const walk = (name, dir) => ({
  id: `char/${name}-${dir}-2`,
  path: `public/game/char/${name}-${dir}-2.webp`,
  w: 32, h: 48, transparent: true,
  from: `char/${name}-${dir}`,
});

const mon = (id, subject) => ({
  id: `mon/${id}`,
  path: `public/game/mon/${id}.webp`,
  w: 96, h: 96, ar: '1:1', model: 'nano_banana_flash',
  transparent: true, align: 'center',
  subject: `a single small cute chibi creature monster, ${subject}, ` +
    'front view facing the viewer, whole body, filling most of the frame',
});

/* stretch: 타일 발자국의 폭을 채우기 위해 허용하는 가로 확대 상한 (post.py 참고).
   1.4를 넘기면 건물이 눌린 게 눈에 보입니다 — 그보다 못 채우는 것은 프롬프트로 고칩니다. */
const obj = (id, tw, th, ar, subject) => ({
  id: `obj/${id}`,
  path: `public/game/obj/${id}.webp`,
  w: tw * 32, h: th * 32, ar, model: 'nano_banana_flash',
  transparent: true, align: 'bottom', stretch: 1.4,
  subject: `${subject}, seen from a slight high angle three-quarter top-down view`,
});

const bg = (id, w, h, ar, model, subject) => ({
  id: `bg/${id}`,
  path: `public/game/bg/${id}.webp`,
  w, h, ar, model, transparent: false, subject,
});

export const ASSETS = [
  /* ── 5.B 캐릭터 18장 (생성 12 · 파생 6) ─────────────────────────── */
  char('hero', 'down', HERO), char('hero', 'up', HERO), char('hero', 'side', HERO),
  walk('hero', 'down'), walk('hero', 'up'), walk('hero', 'side'),

  /* aing-down만 원본 마스코트를 참조합니다. 나머지 아잉은 **aing-down의 원본 PNG**를
     참조로 씁니다(refFrom) — 마스코트 이미지만 참조하면 방향마다 색·비율이 갈립니다.
     1차 생성에서 실제로 갈렸습니다: down은 크림색 통통, up은 하늘색, side는 흰색 날씬. */
  char('aing', 'down', AING, REF_AING),
  char('aing', 'up', `${AING}, exactly the same cat as the reference image`, null, 'char/aing-down'),
  char('aing', 'side', `${AING}, exactly the same cat as the reference image`, null, 'char/aing-down'),
  walk('aing', 'down'), walk('aing', 'up'), walk('aing', 'side'),

  char('prof', 'down',
    `${AING}, the same cat as the reference image but wearing a white lab coat and round glasses`,
    null, 'char/aing-down'),
  char('npc-senior', 'down',
    'a tired office worker in a white dress shirt with the sleeves rolled up, dark trousers, ' +
    'drooping shoulders and dark circles under the eyes'),
  char('npc-ace', 'down',
    'a confident office worker in a sharp navy blazer standing tall with a proud posture, arms crossed'),
  char('npc-junior', 'down',
    'a cheerful young newcomer in a bright yellow hoodie, small and youthful, smiling brightly'),
  char('npc-lead', 'down',
    'a friendly teammate in a moss green casual shirt, holding a closed laptop under one arm'),
  char('npc-nurse', 'down',
    'a cafe barista in a cream apron and a red cap, holding a small round tray'),

  /* ── 5.C 기술몬 21종 ─────────────────────────────────────────────
     로고를 그대로 넣지 않습니다. 형태와 색만 빌린 생물로 의인화합니다(계약 5.C). */
  mon('spring', 'a moss green sprout creature with a single curled leaf growing from its head and a leaf tail, calm and dutiful'),
  mon('springboot', 'a moss green sprout creature wearing chunky brown boots, dashing forward eagerly'),
  mon('jpa', 'a translucent pale blue jellyfish creature carrying three stacked round discs on its back'),
  mon('react', 'a round light ice blue sprite creature with three thin glowing rings orbiting around it'),
  mon('reactnative', 'a small light ice blue sprite creature with two orbiting rings, hugging a flat rounded slab like a shield'),
  mon('aws', 'a plump orange cloud creature with a curved upturned smile and small stubby feet'),
  mon('insight', 'a soft blush pink lantern creature holding a small glowing seed in both hands, warm and gentle'),
  mon('ainews', 'a folded paper bird creature made of blank cream paper, wings spread, blank pages with nothing written'),
  mon('nextjs', 'a smooth round dark indigo creature with a pale crescent shape across its face'),
  mon('fsd', 'a lavender creature built from four neatly stacked rounded slabs, tidy and layered'),
  mon('playwright', 'a small cream creature wearing a blank theatre mask and holding a round magnifying glass'),
  mon('rbac', 'a small stout guardian creature holding a round shield, with an old brass key for a tail'),
  mon('opensearch', 'a creature whose single huge eye is a round magnifying glass lens, deep indigo body with an ember orange ring'),
  mon('resilience', 'a sturdy creature with a thick rounded shell like a bouncing spring, bracing itself'),
  mon('outbox', 'a creature made of a cream paper envelope with small wings and stubby legs'),
  mon('archunit', 'a creature built from four grey stone blocks stacked into a small sturdy arch'),
  mon('vanilla', 'a plain simple pale cream blob creature with a very simple face, unadorned and honest'),
  mon('webgpu', 'a crystalline creature made of pale ice blue faceted triangles, softly luminous, not neon'),
  mon('java', 'a warm brown coffee bean creature holding a steaming cup, gentle steam curling upward'),
  mon('javascript', 'a cheerful pale yellow cube creature with rounded corners and a bright grin'),
  mon('sql', 'a creature made of three stacked blue cylinders like a small tower, with calm eyes'),

  /* ── 5.D 건물·오브젝트 20장 ─────────────────────────────────────── */
  obj('bld-lab', 4, 3, '4:3',
    'a small research laboratory building with white plaster walls, a blue tiled roof and a round observatory dome on top, one wooden front door and two windows'),
  obj('bld-house', 3, 2, '3:2',
    'a small cosy countryside house with cream plaster walls, a red brown tiled roof, a brick chimney, one front door and two windows'),
  obj('bld-office-1', 4, 3, '4:3',
    'an old shabby small office building with grey weathered concrete walls, an air conditioner unit hanging on the wall, small dull windows and a plain glass entrance'),
  obj('bld-office-2', 4, 3, '4:3',
    'a modern seaside office building fronted with pale blue reflective glass and a white steel frame, a wide glass entrance'),
  obj('bld-office-3', 4, 3, '4:3',
    'a bright cheerful startup office building with cream walls, a moss green awning, large friendly windows and a potted plant beside the door'),
  /* 1차 생성에서 폭을 반밖에 못 채웠습니다(타워 49% · 책상 50% · 카페 68%).
     "wide", "broad", "fills the whole width of the frame"로 비율을 못 박습니다. */
  obj('bld-tower', 5, 4, '5:4',
    'a broad wide modern glass office tower, much wider than it is tall, a squat five-floor block ' +
    'clad in ice blue reflective glass with a white frame and a wide lobby entrance across the base, ' +
    'the building fills the entire width of the frame from left edge to right edge'),
  obj('bld-cafe', 3, 2, '3:2',
    'a wide low cosy cafe building with a bright red roof, cream walls, a long striped awning ' +
    'and two large front windows, the building fills the entire width of the frame'),
  obj('bld-gym', 4, 3, '4:3',
    'a sturdy stone gymnasium building with two thick stone pillars flanking a large double door and a grey slate roof'),
  obj('tree', 2, 2, '1:1',
    'a single conifer pine tree with a dark green layered canopy and a straight brown trunk'),
  obj('tree-small', 1, 1, '1:1',
    'a single small round shrub with green leaves on a short brown trunk'),
  obj('rock', 1, 1, '1:1',
    'a single grey boulder covered with patches of green moss'),
  obj('bush', 1, 1, '1:1',
    'a single clump of tall bright yellow green grass, a small patch of waist high grass'),
  obj('sign', 1, 1, '1:1',
    'a small wooden signpost with a completely blank empty board on a wooden post, the board is bare wood with nothing on it'),
  obj('fence', 1, 1, '1:1',
    'a short single section of wooden fence, two horizontal planks across two posts'),
  obj('lamp', 1, 2, '9:16',
    'a tall street lamp with a slim dark metal post and a warm glowing lantern head at the top'),
  obj('flower', 1, 1, '1:1',
    'a small cluster of wild flowers with pink and cream petals and green leaves'),
  obj('mailbox', 1, 1, '1:1',
    'a small mailbox with an ice blue rounded body on a short wooden post'),
  obj('desk', 2, 1, '16:9',
    'a long wide wooden computer desk, twice as wide as it is deep, with a flat monitor, ' +
    'a keyboard and a small desk lamp on top, the desk fills the entire width of the frame'),
  obj('shelf', 1, 2, '9:16',
    'a tall narrow wooden bookshelf with three shelves filled with colourful books'),
  obj('campfire', 1, 1, '1:1',
    'a small campfire, a ring of grey stones around crossed logs with a warm orange flame'),

  /* ── 5.E 배틀 배경 5장 · 5.F 타이틀 1장 ─────────────────────────── */
  bg('battle-1', 512, 192, '21:9', 'nano_banana_flash',
    'a wide grassy meadow clearing seen at ground level, tall grass in the foreground, distant trees and rolling green hills under a clear morning sky, empty scene with no characters'),
  bg('battle-2', 512, 192, '21:9', 'nano_banana_flash',
    'the wide interior of a dim office at night, rows of desks with glowing monitors, ceiling lights, empty scene with no characters'),
  /* 1차 생성에서 선체에 배 이름("SEA DRAGON")이 찍혔습니다. 공통 STYLE의 no text로는
     부족해서 글자가 붙기 쉬운 자리를 직접 지목합니다. */
  bg('battle-3', 512, 192, '21:9', 'nano_banana_flash',
    'a wide harbour quay by the sea, wooden docks, a moored fishing boat with a completely blank ' +
    'unpainted hull, stacked crates and a lighthouse in the distance, empty scene with no characters, ' +
    'nothing is written on the boat, no name on the hull, no signs, no labels on the crates'),
  bg('battle-4', 512, 192, '21:9', 'nano_banana_flash',
    'a wide night sky over a quiet dark hill, scattered stars and a thin crescent moon, deep indigo gradient, empty scene with no characters'),
  /* 헬리패드에 'H'가 찍혔습니다 — 글자입니다. 원 표시만 남깁니다. */
  bg('battle-5', 512, 192, '21:9', 'nano_banana_flash',
    'the wide rooftop of a tall glass tower at dusk, a plain empty painted circle on the deck, ' +
    'safety railings and a city skyline far below, empty scene with no characters, ' +
    'the circle is completely blank with no letter inside it, no markings, no signage'),

  bg('title', 512, 352, '3:2', 'gpt_image_2',
    `a wide title screen illustration: the back view of ${HERO} standing on a grassy hilltop at dawn beside ${AING}, ` +
    'both seen from behind and small in frame, looking out over a wide misty valley toward a rising sun, ' +
    'warm dawn light, calm and hopeful, completely empty sky with no title text'),
];

/** 최종 프롬프트. 표에는 subject만 두고 공통 규격은 여기서 한 번에 붙입니다. */
export function promptOf(a) {
  return `${a.subject}, ${STYLE}${a.transparent ? CUTOUT : ''}`;
}

for (const a of ASSETS) if (!a.from) a.prompt = promptOf(a);

/** 계약 7절 단가. gen.mjs가 소모 크레딧을 이걸로 셉니다. */
export const PRICE = { nano_banana_flash: 1.5, gpt_image_2: 7, image_background_remover: 0.2 };

export const byId = (id) => ASSETS.find((a) => a.id === id);
