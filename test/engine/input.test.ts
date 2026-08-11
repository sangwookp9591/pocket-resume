/* 입력은 브라우저 API지만 상태 기계는 순수합니다.
   가짜 el에 리스너를 받아 두고 이벤트를 직접 던져 봅니다 — jsdom 없이. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../../lib/engine/input.ts';

type Listener = (e: Record<string, unknown>) => void;

/** 브라우저 없이 리스너만 받아 두는 가짜 요소. createInput은 이것만 있으면 됩니다. */
function fakeEl() {
  const ls = new Map<string, Listener[]>();
  return {
    ownerDocument: undefined,
    addEventListener: (ev: string, fn: Listener) => ls.set(ev, [...(ls.get(ev) ?? []), fn]),
    removeEventListener: (ev: string, fn: Listener) =>
      ls.set(ev, (ls.get(ev) ?? []).filter((f) => f !== fn)),
    fire: (ev: string, e: Record<string, unknown> = {}) =>
      (ls.get(ev) ?? []).forEach((f) => f({ preventDefault() {}, ...e })),
    count: (ev: string) => (ls.get(ev) ?? []).length,
  };
}
type FakeEl = ReturnType<typeof fakeEl>;

/* createInput은 HTMLElement를 받지만 실제로 쓰는 것은 리스너 등록뿐입니다.
   jsdom을 끌어오는 대신 여기서만 형을 맞춥니다. */
const asEl = (el: FakeEl) => el as unknown as HTMLElement;

const down = (el: FakeEl, code: string) => el.fire('keydown', { code });
const up = (el: FakeEl, code: string) => el.fire('keyup', { code });

test('키를 누르면 dir가 래치되고 dirHeld가 선다', () => {
  const el = fakeEl();
  const inp = createInput(asEl(el));
  down(el, 'ArrowRight');
  assert.equal(inp.dir, 'right');
  assert.equal(inp.dirHeld, 'right');
  inp.consume();
  assert.equal(inp.dir, null, 'consume 후 래치는 비어야 합니다');
  assert.equal(inp.dirHeld, 'right', '누르고 있는 동안은 계속 걷습니다');
  up(el, 'ArrowRight');
  assert.equal(inp.dirHeld, null);
});

test('WASD도 같은 축으로 들어온다', () => {
  const el = fakeEl();
  const inp = createInput(asEl(el));
  down(el, 'KeyW');
  assert.equal(inp.dirHeld, 'up');
  down(el, 'KeyA');
  assert.equal(inp.dirHeld, 'left', '대각선은 마지막에 누른 축 우선');
  up(el, 'KeyA');
  assert.equal(inp.dirHeld, 'up', '앞서 누른 키가 살아 있으면 그쪽으로 돌아옵니다');
});

test('키 반복(e.repeat)은 무시한다', () => {
  const el = fakeEl();
  const inp = createInput(asEl(el));
  down(el, 'ArrowUp');
  inp.consume();
  el.fire('keydown', { code: 'ArrowUp', repeat: true });
  assert.equal(inp.dir, null, '반복 이벤트로 다시 한 칸 걸으면 안 됩니다');
});

test('confirm·cancel·menu는 1회 래치, run은 눌린 상태 그대로', () => {
  const el = fakeEl();
  const inp = createInput(asEl(el));
  down(el, 'Space');
  assert.equal(inp.confirm, true);
  inp.consume();
  assert.equal(inp.confirm, false);

  down(el, 'Escape');
  assert.equal(inp.cancel, true);
  down(el, 'Tab');
  assert.equal(inp.menu, true);
  inp.consume();

  down(el, 'ShiftLeft');
  assert.equal(inp.run, true);
  inp.consume();
  assert.equal(inp.run, true, 'run은 consume해도 눌린 상태입니다');
  up(el, 'ShiftLeft');
  assert.equal(inp.run, false);
});

test('blur에서 전부 놓는다 — 탭 전환 후 계속 걷는 버그', () => {
  const el = fakeEl();
  const inp = createInput(asEl(el));
  down(el, 'ArrowDown');
  down(el, 'ShiftLeft');
  el.fire('blur');
  assert.equal(inp.dirHeld, null);
  assert.equal(inp.run, false);
});

test('모르는 키는 무시한다', () => {
  const el = fakeEl();
  const inp = createInput(asEl(el));
  down(el, 'KeyQ');
  assert.equal(inp.dirHeld, null);
  assert.equal(inp.confirm, false);
});

test('터치: 끌면 방향, 끌지 않은 탭은 확인', () => {
  const el = fakeEl();
  const inp = createInput(asEl(el));
  el.fire('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 });
  el.fire('pointermove', { pointerId: 1, clientX: 100, clientY: 140 });
  assert.equal(inp.dirHeld, 'down');
  el.fire('pointerup', { pointerId: 1, clientX: 100, clientY: 140 });
  assert.equal(inp.dirHeld, null);

  inp.consume();
  el.fire('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 10, clientY: 10 });
  el.fire('pointerup', { pointerId: 2, clientX: 12, clientY: 11 });
  assert.equal(inp.confirm, true, '데드존 안의 탭은 확인입니다');
});

test('destroy가 리스너를 남기지 않는다', () => {
  const el = fakeEl();
  const inp = createInput(asEl(el));
  assert.ok(el.count('keydown') > 0);
  inp.destroy();
  assert.equal(el.count('keydown'), 0);
  assert.equal(el.count('pointerdown'), 0);
});
