/* 고정 스텝 루프. 클램프가 없으면 탭에서 돌아왔을 때 수백 프레임을 한 번에 돕니다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoop, STEP_MS, MAX_ACC_MS } from '../../lib/engine/loop.ts';

function harness() {
  const steps = [];
  const alphas = [];
  let id = 0;
  const pending = [];
  const loop = createLoop({
    update: (dt) => steps.push(dt),
    render: (a) => alphas.push(a),
    now: () => 0,
    raf: (cb) => {
      pending.push(cb);
      return ++id;
    },
    caf: () => {},
  });
  return { loop, steps, alphas, pending };
}

test('16.7ms마다 정확히 한 스텝', () => {
  const { loop, steps } = harness();
  loop.start();
  loop.tick(STEP_MS);
  assert.equal(steps.length, 1);
  assert.equal(steps[0], STEP_MS / 1000);
});

test('프레임이 길면 여러 스텝을 밀어 넣는다', () => {
  const { loop, steps } = harness();
  loop.start();
  loop.tick(100); // 100ms → 5스텝(83.3ms) + 잔여 16.7ms
  assert.equal(steps.length, 5);
});

test('누적 시간은 250ms에서 잘린다', () => {
  const { loop, steps } = harness();
  loop.start();
  loop.tick(10_000); // 탭이 10초 백그라운드 → 600프레임이 아니라 250ms어치만
  assert.equal(steps.length, 15, '250ms / 16.67ms = 15스텝');
  assert.ok(steps.length * STEP_MS <= MAX_ACC_MS + 1e-9);
});

test('보간 계수는 0 이상 1 미만', () => {
  const { loop, alphas } = harness();
  loop.start();
  for (const t of [7, 20, 55, 300, 5000]) loop.tick(t);
  for (const a of alphas) assert.ok(a >= 0 && a < 1, `alpha=${a}`);
});

test('시계가 뒤로 가도 스텝이 음수가 되지 않는다', () => {
  const { loop, steps } = harness();
  loop.start();
  loop.tick(100);
  const n = steps.length;
  loop.tick(50); // 뒤로
  assert.equal(steps.length, n);
});

test('stop 후에는 tick이 아무것도 하지 않는다', () => {
  const { loop, steps } = harness();
  loop.start();
  assert.equal(loop.running, true);
  loop.stop();
  assert.equal(loop.running, false);
  loop.tick(1000);
  assert.equal(steps.length, 0);
});

test('start를 두 번 불러도 rAF는 하나만 돈다', () => {
  const { loop, pending } = harness();
  loop.start();
  loop.start();
  assert.equal(pending.length, 1);
});
