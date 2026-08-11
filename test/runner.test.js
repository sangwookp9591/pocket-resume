/* 러너는 모든 대사가 지나가는 길목이라, 여기가 틀리면 게임이 중간에 조용히 멈춥니다.
   실제 스크립트(content/script.js) 전부를 끝까지 밟아 보는 검사가 마지막에 있습니다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, interpolate } from '../lib/game/runner.js';
import { createState, testAll } from '../lib/game/state.js';
import { SCRIPTS } from '../content/script.js';

function run(cmds, init = createState()) {
  let state = init;
  const r = createRunner(cmds, { getState: () => state, setState: (s) => (state = s) });
  return { r, get state() { return state; } };
}

/** 러너를 끝까지 밟습니다. 선택지는 pick(고를 가지)로 고릅니다. */
function drain(ctx, { pick = 0, name = '테스트', max = 500 } = {}) {
  const seen = [];
  let step = ctx.r.next();
  for (let n = 0; n < max; n++) {
    seen.push(step);
    if (step.kind === 'done') return seen;
    if (step.kind === 'choose') step = ctx.r.pick(step, Math.min(pick, step.options.length - 1));
    else if (step.kind === 'input') step = ctx.r.answer(step.field, name);
    else step = ctx.r.next();
  }
  throw new Error('러너가 안 끝난다 — 무한 루프');
}

test('대사를 순서대로 낸다', () => {
  const c = run([{ t: '하나' }, { t: '둘' }]);
  assert.equal(c.r.next().t, '하나');
  assert.equal(c.r.next().t, '둘');
  assert.equal(c.r.next().kind, 'done');
});

test('{name}이 실제 이름으로 바뀐다', () => {
  const s = { ...createState(), name: '상욱' };
  assert.equal(interpolate('{name}은(는) 걸었다', s), '상욱은(는) 걸었다');
  assert.equal(interpolate('{name}', createState()), '너'); // 이름 없으면 기본값
});

test('이름 입력이 상태에 들어가고 8자로 잘린다', () => {
  const c = run([{ input: 'name' }, { t: '{name}!' }]);
  const step = c.r.next();
  assert.equal(step.kind, 'input');
  assert.equal(c.r.answer('name', '아주아주아주긴이름입니다').t, '아주아주아주긴이!');
});

test('빈 이름은 기본값이 된다 — 이름 없는 세이브가 생기지 않게', () => {
  const c = run([{ input: 'name' }]);
  c.r.next();
  c.r.answer('name', '   ');
  assert.equal(c.state.name, '아이언');
});

test('set·badge·give가 상태를 바꾼다', () => {
  const c = run([{ set: 'flagA' }, { badge: 'confidence' }, { give: 'react' }, { t: '끝' }]);
  assert.equal(c.r.next().t, '끝');
  assert.ok(c.state.flags.includes('flagA'));
  assert.ok(c.state.badges.includes('confidence'));
  assert.ok(c.state.dex.includes('react'));
  assert.equal(c.state.party.length, 1);
  // 배지는 flags에도 badge.<id>로 올라가야 맵의 unless가 읽습니다
  assert.ok(testAll(c.state, 'badge.confidence'));
});

test('require가 충족되지 않으면 조용히 끝난다', () => {
  const c = run([{ require: 'has.spring' }, { t: '여기까지 오면 안 된다' }]);
  assert.equal(c.r.next().kind, 'done');
});

test('require가 충족되면 계속 간다', () => {
  const init = { ...createState(), dex: ['spring'] };
  const c = run([{ require: 'has.spring' }, { t: '통과' }], init);
  assert.equal(c.r.next().t, '통과');
});

test('unless는 조건이 없을 때 말하고 멈춘다', () => {
  const c = run([{ unless: 'canChoose', t: '아직이다' }, { t: '여기까진 안 온다' }]);
  assert.equal(c.r.next().t, '아직이다');
  assert.equal(c.r.next().kind, 'done');
});

test('unless는 조건이 이미 참이면 건너뛴다', () => {
  const init = { ...createState(), flags: ['canChoose'] };
  const c = run([{ unless: 'canChoose', t: '아직이다' }, { t: '통과' }], init);
  assert.equal(c.r.next().t, '통과');
});

test('block이 나오면 blocked가 선다', () => {
  const c = run([{ t: '못 지나간다' }, { block: true }]);
  drain(c);
  assert.equal(c.r.blocked, true);
});

test('선택지가 고른 가지의 명령을 이어 붙인다', () => {
  const c = run([
    { choose: [
      { label: 'A', then: [{ t: 'A를 골랐다' }, { set: 'pickedA' }] },
      { label: 'B', then: [{ t: 'B를 골랐다' }] },
    ] },
    { t: '공통 마무리' },
  ]);
  const step = c.r.next();
  assert.equal(step.kind, 'choose');
  assert.equal(step.options.length, 2);
  assert.equal(c.r.pick(step, 0).t, 'A를 골랐다');
  assert.equal(c.r.next().t, '공통 마무리');
  assert.ok(c.state.flags.includes('pickedA'));
});

test('face가 대사에 실려 나온다', () => {
  const c = run([{ face: 'cheer', who: '아잉', t: '야호' }, { t: '다음' }]);
  const a = c.r.next();
  assert.equal(a.face, 'cheer');
  assert.equal(a.who, '아잉');
  // 다음 대사도 표정을 유지합니다 — 매 줄마다 다시 지정하지 않아도 되게
  assert.equal(c.r.next().face, 'cheer');
});

test('모르는 명령은 던진다 — 조용히 버리면 나중에 대사가 사라진다', () => {
  const c = run([{ 이상한거: 1 }]);
  assert.throws(() => c.r.next(), /모르는 명령/);
});

test('battle·scene·warp를 밖으로 낸다', () => {
  const c = run([{ battle: { mon: 'spring', level: 5 } }, { scene: 'hall' }]);
  assert.equal(c.r.next().kind, 'battle');
  assert.equal(c.r.next().kind, 'scene');
});

test('실제 스크립트 43개가 전부 끝까지 밟힌다 (선택지는 첫 가지)', () => {
  // 모든 조건을 채운 상태 — 그래야 require 뒤의 대사까지 들어갑니다.
  const full = {
    ...createState(),
    name: '상욱',
    dex: ['spring', 'springboot', 'jpa', 'react', 'reactnative', 'aws', 'insight', 'ainews',
      'nextjs', 'fsd', 'playwright', 'rbac', 'opensearch', 'resilience', 'outbox',
      'archunit', 'vanilla', 'webgpu'],
    flags: ['canChoose', 'starterChosen', 'aingJoined', 'canWork'],
    badges: ['confidence', 'humility', 'insight', 'connect'],
  };
  for (const [name, cmds] of Object.entries(SCRIPTS)) {
    for (const pick of [0, 1]) {
      const c = run(cmds, { ...full, party: [] });
      assert.doesNotThrow(() => drain(c, { pick }), `${name} (선택지 ${pick})에서 터졌다`);
    }
  }
});

test('아무 조건도 없는 새 게임 상태에서도 스크립트가 터지지 않는다', () => {
  for (const [name, cmds] of Object.entries(SCRIPTS)) {
    const c = run(cmds);
    assert.doesNotThrow(() => drain(c), `${name}이(가) 새 게임 상태에서 터졌다`);
  }
});
