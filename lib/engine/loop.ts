/* 고정 스텝 60Hz 시뮬레이션 + 보간 렌더.
   저프레임에서 이동이 어긋나지 않게, 그리고 탭이 백그라운드였다가 돌아왔을 때
   200프레임을 한 번에 돌지 않게 하는 것이 전부입니다. */

export const STEP_MS = 1000 / 60;
export const MAX_ACC_MS = 250; // 이 이상 쌓인 시간은 버립니다

/**
 * @param {{update:(dt:number)=>void, render:(alpha:number)=>void,
 *          now?:()=>number, raf?:(cb)=>number, caf?:(id)=>void}} opts
 *   now/raf/caf는 테스트 주입용입니다. 기본값은 브라우저 것.
 * @returns {{start:()=>void, stop:()=>void, running:boolean, tick:(t:number)=>void}}
 */
export function createLoop({ update, render, now, raf, caf } = {}) {
  const clock = now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const req = raf ?? ((cb) => requestAnimationFrame(cb));
  const cancel = caf ?? ((id) => cancelAnimationFrame(id));

  let running = false;
  let handle = null;
  let last = 0;
  let acc = 0;

  /** 한 프레임. rAF가 넘겨주는 타임스탬프를 그대로 받습니다. */
  function tick(t) {
    if (!running) return;
    let dt = t - last;
    last = t;
    if (dt < 0) dt = 0; // 시계가 뒤로 가는 일은 있습니다
    acc = Math.min(acc + dt, MAX_ACC_MS);

    while (acc >= STEP_MS) {
      acc -= STEP_MS;
      update(STEP_MS / 1000);
    }
    render(acc / STEP_MS); // 0..1 보간 계수
    handle = req(tick);
  }

  return {
    get running() {
      return running;
    },
    start() {
      if (running) return;
      running = true;
      last = clock();
      acc = 0;
      handle = req(tick);
    },
    stop() {
      if (!running) return;
      running = false;
      if (handle != null) cancel(handle);
      handle = null;
    },
    tick, // 테스트에서 직접 돌립니다
  };
}
