/* 대사 스크립트 실행기. content/script.js의 명령 배열을 한 걸음씩 소비합니다.

   즉시 명령(set·give·badge·face…)은 안에서 처리하고, 화면이 필요한 것만 밖으로 냅니다.
   그래서 UI는 "지금 무엇을 보여 줄지"만 알면 되고, 상태 변경 규칙을 모릅니다. */

import { testAll, setFlag, addBadge, addMon } from './state.ts';
import { byId } from '../../content/mons.ts';
import { healParty } from './battle.ts';
import type { Choice, Cmd, Face, GameState, MonId } from '../../content/types.ts';

/** 러너가 밖으로 내는 것. UI는 이것만 보고 무엇을 그릴지 정합니다. */
export type Step =
  | { kind: 'text'; who: string | null; t: string; face: Face }
  | { kind: 'banner'; text: string }
  | { kind: 'fx'; fx: NonNullable<Cmd['fx']> }
  | { kind: 'wait'; ms: number }
  | { kind: 'input'; field: 'name' }
  | { kind: 'battle'; battle: NonNullable<Cmd['battle']> }
  | { kind: 'scene'; scene: NonNullable<Cmd['scene']> }
  | { kind: 'warp'; warp: NonNullable<Cmd['warp']> }
  | { kind: 'choose'; options: Array<{ i: number; label: string; desc: string | null }>; _raw: Choice[] }
  | { kind: 'done'; blocked: boolean };

export interface RunnerApi {
  getState: () => GameState;
  setState: (s: GameState) => void;
}

export interface Runner {
  next: () => Step;
  pick: (step: Step, i: number) => Step;
  answer: (field: string, value: string) => Step;
  readonly blocked: boolean;
  readonly done: boolean;
}

/** '{name}'을(를) 실제 이름으로. 문장부호 규칙은 한국어 조사라 여기서 다루지 않습니다. */
export function interpolate(text: string | undefined, state: GameState): string {
  return String(text ?? '').replaceAll('{name}', state.name || '너');
}

/**
 * @param {Array} cmds     실행할 명령 배열
 * @param {object} api     { getState, setState }
 * @returns 걸음마다 { kind, ... }를 돌려주는 러너
 */
export function createRunner(cmds: Cmd[], api: RunnerApi): Runner {
  const queue = [...cmds];
  let blocked = false; // { block: true }가 나왔는가 — 이동을 막을지 호출부가 봅니다
  let face: Face = 'neutral'; // 아잉의 현재 표정. text에 함께 실어 보냅니다
  let done = false;

  const S = () => api.getState();
  const put = (fn: (s: GameState) => GameState) => api.setState(fn(S()));

  /** 다음으로 보여 줄 것을 돌려줍니다. 아무것도 없으면 { kind: 'done' }. */
  function next(): Step {
    while (queue.length) {
      const c = queue.shift()!; // while(queue.length) 뒤라 반드시 있습니다

      // ── 조건 ──
      if (c.require !== undefined) {
        if (!testAll(S(), c.require)) return finish();
        continue; // 통과했으면 이 줄은 가드일 뿐입니다
      }
      if (c.unless !== undefined && !testAll(S(), c.unless)) {
        // unless는 "그게 아직 아니라면 이 말을 하고 멈춰라"입니다.
        queue.length = 0;
        if (c.t) return { kind: 'text', who: c.who ?? null, t: interpolate(c.t, S()), face };
        return finish();
      }
      if (c.unless !== undefined) continue; // 조건이 이미 충족 → 이 줄은 건너뜁니다

      // ── 즉시 처리 ──
      if (c.set) { const f = c.set; put((s) => setFlag(s, f)); continue; }
      if (c.badge) { const b = c.badge; put((s) => setFlag(addBadge(s, b), `badge.${b}`)); continue; }
      if (c.give) { const g = c.give; put((s) => addMon(s, g, startLevel(g))); continue; }
      if (c.dex) { const d = c.dex; put((s) => addMon(s, d, startLevel(d))); continue; }
      if (c.heal) { put((s) => ({ ...s, party: healParty(s.party) })); continue; }
      if (c.face) { face = c.face; if (!('t' in c)) continue; }
      if (c.block) { blocked = true; continue; }

      // ── 화면이 필요한 것 ──
      if ('t' in c) return { kind: 'text', who: c.who ?? null, t: interpolate(c.t, S()), face };
      if (c.banner) return { kind: 'banner', text: c.banner };
      if (c.fx) return { kind: 'fx', fx: c.fx };
      if (c.wait) return { kind: 'wait', ms: c.wait };
      if (c.input) return { kind: 'input', field: c.input };
      if (c.battle) return { kind: 'battle', battle: c.battle };
      if (c.scene) return { kind: 'scene', scene: c.scene };
      if (c.warp) return { kind: 'warp', warp: c.warp };
      if (c.choose) {
        return {
          kind: 'choose',
          options: c.choose.map((o, i) => ({ i, label: o.label, desc: o.desc ?? null })),
          _raw: c.choose,
        };
      }
      // 모르는 명령을 조용히 버리면 나중에 "왜 이 대사가 안 나오지"로 돌아옵니다.
      throw new Error(`모르는 명령: ${JSON.stringify(c)}`);
    }
    return finish();
  }

  function finish(): Step {
    done = true;
    return { kind: 'done', blocked };
  }

  /** 선택지를 고릅니다. 고른 가지의 명령이 큐 맨 앞에 끼어듭니다. */
  function pick(step: Step, i: number): Step {
    const branch = step.kind === 'choose' ? step._raw[i] : undefined;
    if (!branch) throw new Error(`없는 선택지: ${i}`);
    queue.unshift(...(branch.then ?? []));
    return next();
  }

  /** 이름을 받습니다. */
  function answer(field: string, value: string): Step {
    if (field === 'name') put((s) => ({ ...s, name: String(value).slice(0, 8).trim() || '아이언' }));
    return next();
  }

  return { next, pick, answer, get blocked() { return blocked; }, get done() { return done; } };
}

/* 잡은 기술의 시작 레벨. 서사 순서대로 올라갑니다 —
   1사에서 잡은 것이 4사에서 잡은 것과 같은 레벨이면 진행감이 없습니다. */
function startLevel(id: MonId): number {
  const where = byId[id]?.where ?? 1;
  return [5, 5, 12, 22, 44][where] ?? 5;
}
