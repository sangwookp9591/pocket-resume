/* 방향키 · WASD · 게임패드 · 터치 D-pad를 한 축으로 모읍니다.
   키 반복(e.repeat)은 무시하고 눌린 상태를 직접 관리합니다 — OS 반복 지연에
   이동 속도가 끌려다니지 않게. blur에서 전부 놓습니다: 탭 전환 후 계속 걷는
   버그의 원인이 이것 하나입니다. */

const DIRS = ['up', 'down', 'left', 'right'];

// e.code(물리 키) 우선. 자판 배열이 바뀌어도 WASD 위치는 그대로입니다.
const BY_CODE = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  KeyZ: 'confirm',
  Escape: 'cancel',
  KeyX: 'cancel',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Tab: 'menu',
};

const BY_KEY = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  Enter: 'confirm',
  ' ': 'confirm',
  z: 'confirm',
  Escape: 'cancel',
  x: 'cancel',
  Shift: 'run',
  Tab: 'menu',
};

// 게임패드 버튼 → 액션 (표준 매핑)
const PAD_BUTTONS = { 12: 'up', 13: 'down', 14: 'left', 15: 'right', 0: 'confirm', 1: 'cancel', 2: 'run', 9: 'menu' };
const STICK = 0.5; // 좌스틱 임계값
const TOUCH_DEAD = 16; // 이만큼 끌어야 방향으로 칩니다 (px)

/**
 * @param {EventTarget} el 포인터(터치)를 받을 요소. 키보드는 el의 window에 붙습니다.
 * @returns {{dir, dirHeld, confirm, cancel, run, menu, consume, poll, destroy}}
 *   dir      — 새로 눌린 방향 1회분(래치). consume()에서 지워집니다. 한 칸 이동용.
 *   dirHeld  — 지금 눌려 있는 방향. 계속 걷기용. 대각선은 마지막에 누른 축 우선.
 *   confirm/cancel/menu — 눌린 순간 1회(래치), run — 눌린 상태 그대로.
 */
export function createInput(el) {
  const win = el?.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : el);
  const held = new Set(); // 눌려 있는 액션
  const stack = []; // 방향만, 누른 순서. 마지막이 우선.
  const latched = { dir: null, confirm: false, cancel: false, menu: false };

  function press(action) {
    if (!action || held.has(action)) return; // 반복 무시
    held.add(action);
    if (DIRS.includes(action)) {
      stack.push(action);
      latched.dir = action;
    } else if (action !== 'run') {
      latched[action] = true;
    }
  }

  function release(action) {
    if (!action || !held.delete(action)) return;
    const i = stack.indexOf(action);
    if (i >= 0) stack.splice(i, 1);
  }

  function releaseAll() {
    held.clear();
    stack.length = 0;
  }

  /* ── 키보드 ─────────────────────────────────────────────── */
  const onKeyDown = (e) => {
    const a = BY_CODE[e.code] ?? BY_KEY[e.key];
    if (!a) return;
    e.preventDefault?.(); // 스페이스 스크롤·Tab 포커스 이동 차단
    if (e.repeat) return;
    press(a);
  };
  const onKeyUp = (e) => {
    const a = BY_CODE[e.code] ?? BY_KEY[e.key];
    if (a) release(a);
  };
  const onBlur = () => releaseAll();

  /* ── 터치 가상 D-pad ─────────────────────────────────────
     화면에 그리지 않습니다(UI는 코디네이터 몫). 누른 자리가 원점인
     상대 스틱입니다 — 엄지가 어디에 닿든 바로 걷습니다. */
  let touch = null;
  const onDown = (e) => {
    if (e.pointerType === 'mouse') return;
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY, dir: null, moved: false };
    el.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!touch || e.pointerId !== touch.id) return;
    const dx = e.clientX - touch.x;
    const dy = e.clientY - touch.y;
    if (Math.hypot(dx, dy) < TOUCH_DEAD) return;
    touch.moved = true;
    const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    if (d !== touch.dir) {
      if (touch.dir) release(touch.dir);
      touch.dir = d;
      press(d);
    }
  };
  const onUp = (e) => {
    if (!touch || e.pointerId !== touch.id) return;
    if (touch.dir) release(touch.dir);
    else if (!touch.moved) {
      // 끌지 않은 탭 = 확인
      press('confirm');
      release('confirm');
    }
    touch = null;
  };

  /* ── 게임패드 ────────────────────────────────────────────
     이벤트가 없는 유일한 입력이라 접근할 때마다 폴링합니다.
     navigator.getGamepads()는 싸고, 프레임당 몇 번 불러도 문제없습니다. */
  const padHeld = new Set();
  function poll() {
    const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() ?? [] : [];
    const now = new Set();
    for (const p of pads) {
      if (!p) continue;
      for (const [i, a] of Object.entries(PAD_BUTTONS)) {
        if (p.buttons[i]?.pressed) now.add(a);
      }
      const [ax, ay] = [p.axes[0] ?? 0, p.axes[1] ?? 0];
      if (ax < -STICK) now.add('left');
      else if (ax > STICK) now.add('right');
      if (ay < -STICK) now.add('up');
      else if (ay > STICK) now.add('down');
    }
    for (const a of now) if (!padHeld.has(a)) press(a);
    for (const a of padHeld) if (!now.has(a)) release(a);
    padHeld.clear();
    for (const a of now) padHeld.add(a);
  }

  const on = (t, ev, fn, opts) => t?.addEventListener?.(ev, fn, opts);
  on(win, 'keydown', onKeyDown);
  on(win, 'keyup', onKeyUp);
  on(win, 'blur', onBlur);
  on(el, 'pointerdown', onDown);
  on(el, 'pointermove', onMove);
  on(el, 'pointerup', onUp);
  on(el, 'pointercancel', onUp);

  return {
    get dir() {
      poll();
      return latched.dir;
    },
    get dirHeld() {
      poll();
      return stack.length ? stack[stack.length - 1] : null;
    },
    get confirm() {
      poll();
      return latched.confirm;
    },
    get cancel() {
      poll();
      return latched.cancel;
    },
    get menu() {
      poll();
      return latched.menu;
    },
    get run() {
      poll();
      return held.has('run');
    },
    /** 래치된 1회성 입력을 비웁니다. 한 프레임 끝에 부릅니다. */
    consume() {
      latched.dir = null;
      latched.confirm = false;
      latched.cancel = false;
      latched.menu = false;
    },
    poll,
    destroy() {
      const off = (t, ev, fn) => t?.removeEventListener?.(ev, fn);
      off(win, 'keydown', onKeyDown);
      off(win, 'keyup', onKeyUp);
      off(win, 'blur', onBlur);
      off(el, 'pointerdown', onDown);
      off(el, 'pointermove', onMove);
      off(el, 'pointerup', onUp);
      off(el, 'pointercancel', onUp);
      releaseAll();
    },
  };
}
