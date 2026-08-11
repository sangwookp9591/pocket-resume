'use client';

/* 씬 관리자. 상태는 전부 여기 있고, 아래 컴포넌트들은 받은 것만 그립니다.

   프레임 루프는 React 밖에서 돕니다 — 60Hz로 setState를 부르면 게임이 아니라
   리렌더 벤치마크가 됩니다. 캔버스는 ref로만 만지고, React는 오버레이만 맡습니다. */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createRenderer } from '../lib/engine/renderer.js';
import { createLoop } from '../lib/engine/loop.js';
import { createInput } from '../lib/engine/input.js';
import { VIEW_W, VIEW_H, WIDTH, HEIGHT } from '../lib/engine/config.js';
import { tintFor } from '../lib/engine/palette.js';
import { loadAssets } from '../lib/game/assets.js';
import { drawWorld } from '../lib/game/draw.js';
import { createWorld, camera } from '../lib/game/world.js';
import { createRunner } from '../lib/game/runner.js';
import { createState, load, save, clearSave, addMon, moveTo } from '../lib/game/state.js';
import { SCRIPTS } from '../content/script.js';
import { MAPS } from '../content/maps.js';
import Battle from './Battle.jsx';
import { DialogueBox, Choices, NameInput, Banner, Dex, Menu, TitleScreen, HallOfFame, TouchPad } from './ui.jsx';

export default function Game() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const worldRef = useRef(null);
  const inputRef = useRef(null);
  const runnerRef = useRef(null);
  const stateRef = useRef(createState());
  const [, forceUI] = useReducer((n) => n + 1, 0);

  const [scene, setScene] = useState('title'); // title | loading | world | hall | credits
  const [step, setStep] = useState(null); // 러너가 낸 현재 화면
  const [battle, setBattle] = useState(null);
  const [overlay, setOverlay] = useState(null); // dex | menu
  const [banner, setBanner] = useState(null);
  const [boot, setBoot] = useState({ done: false, pct: 0, backend: '', missing: 0 });
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => setHasSave(!!load()), []);

  const getState = useCallback(() => stateRef.current, []);
  const setState = useCallback((s) => { stateRef.current = s; forceUI(); }, []);

  /* ── 스크립트 실행 ─────────────────────────────────────────── */
  const pump = useCallback((r) => {
    let s = r.next();
    // 화면이 필요 없는 것은 여기서 소화합니다.
    while (s.kind === 'banner' || s.kind === 'fx' || s.kind === 'wait' || s.kind === 'warp') {
      if (s.kind === 'banner') { setBanner(s.text); break; }
      if (s.kind === 'warp') { doWarp(s.warp); s = r.next(); continue; }
      s = r.next(); // fx·wait는 지금은 즉시 통과 (연출은 CSS가 맡습니다)
    }
    if (s.kind === 'done') {
      runnerRef.current = null;
      setStep(null);
      persist();
      return;
    }
    if (s.kind === 'battle') { setBattle(s.battle); setStep(null); return; }
    if (s.kind === 'scene') { runnerRef.current = null; setStep(null); setScene(s.scene); return; }
    setStep(s);
  }, []);

  const runScript = useCallback((name) => {
    const cmds = SCRIPTS[name];
    if (!cmds) { console.warn(`[game] 없는 스크립트: ${name}`); return; }
    const r = createRunner(cmds, { getState, setState });
    runnerRef.current = r;
    pump(r);
  }, [getState, setState, pump]);

  const advance = useCallback(() => {
    const r = runnerRef.current;
    if (!r) return;
    pump(r);
  }, [pump]);

  /* ── 월드 이벤트 ───────────────────────────────────────────── */
  const doWarp = useCallback((w) => {
    const world = worldRef.current;
    if (!world) return;
    const enter = world.goto(w.to, w.tx, w.ty, w.dir);
    setState(moveTo(getState(), w.to, w.tx, w.ty, w.dir ?? getState().dir));
    if (enter) runScript(enter.script);
  }, [getState, setState, runScript]);

  const handleWorldEvent = useCallback((e) => {
    if (!e) return;
    if (e.kind === 'warp') return doWarp(e.warp);
    if (e.kind === 'encounter') {
      return setBattle({ mon: e.mon, level: encounterLevel(getState()), bg: bgFor(worldRef.current?.map.id) });
    }
    if (e.kind === 'script') {
      if (e.event?.once) setState({ ...getState(), flags: [...getState().flags, `ev.${e.script}`] });
      runScript(e.script);
    }
  }, [doWarp, getState, setState, runScript]);

  /* ── 부팅: 렌더러 + 에셋 + 루프 ─────────────────────────────── */
  useEffect(() => {
    if (scene !== 'world' || rendererRef.current) return;
    let stop = () => {};
    let dead = false;

    (async () => {
      const r = await createRenderer(canvasRef.current, { width: WIDTH, height: HEIGHT });
      if (dead) return r.destroy();
      rendererRef.current = r;
      const res = await loadAssets(r, { onProgress: (n, t) => setBoot((b) => ({ ...b, pct: n / t })) });
      if (dead) return r.destroy();
      setBoot({ done: true, pct: 1, backend: r.backend, missing: res.placeholder.length });

      const input = createInput(canvasRef.current);
      inputRef.current = input;

      const loop = createLoop({
        update: (dt) => {
          const w = worldRef.current;
          if (!w) return;
          // loop.js는 초 단위로 줍니다(STEP_MS/1000). world는 ms로 셉니다 —
          // 여기서 안 맞추면 160ms 이동이 160초가 됩니다.
          w.update(dt * 1000);
          // UI가 떠 있으면 걷지 않습니다. 대화 중에 뒤에서 움직이면 안 됩니다.
          if (runnerRef.current || battleRef.current || overlayRef.current) { input.consume(); return; }
          const d = input.dirHeld;
          if (d) w.press(d, input.run);
          if (input.confirm) handleWorldEvent(w.interact());
          if (input.menu) setOverlay('menu');
          input.consume();
          const p = w.takePending();
          if (p) handleWorldEvent(p);
        },
        render: () => {
          const w = worldRef.current;
          if (!w) return;
          const view = w.view();
          const t = tintFor(view.map.time);
          r.setTint(t.rgba, t.strength);
          drawWorld(r, view, camera(view, VIEW_W, VIEW_H), { timeMs: performance.now() });
        },
      });
      loop.start();
      // 개발용 손잡이. 브라우저 콘솔에서 상태를 들여다보려면 이게 있어야 합니다.
      if (process.env.NODE_ENV !== 'production') {
        window.__game = {
          get pos() { return worldRef.current?.pos; },
          get map() { return worldRef.current?.map.id; },
          get state() { return stateRef.current; },
          get running() { return loop.running; },
          get busy() { return { runner: !!runnerRef.current, battle: !!battleRef.current, overlay: overlayRef.current }; },
          input, renderer: r, world: () => worldRef.current,
        };
      }
      stop = () => { loop.stop(); input.destroy(); r.destroy(); };
    })();

    return () => { dead = true; stop(); rendererRef.current = null; };
  }, [scene, handleWorldEvent]);

  // 루프 안에서 최신 값을 보려면 ref가 필요합니다 — 클로저가 첫 렌더에 묶입니다.
  const battleRef = useRef(null);
  const overlayRef = useRef(null);
  useEffect(() => { battleRef.current = battle; }, [battle]);
  useEffect(() => { overlayRef.current = overlay; }, [overlay]);

  /* ── 화면 배율. 정수배만 — 픽셀이 흐려지면 안 됩니다 ─────────── */
  useEffect(() => {
    const fit = () => {
      const c = canvasRef.current;
      if (!c) return;
      const s = Math.max(1, Math.min(Math.floor(window.innerWidth / WIDTH), Math.floor((window.innerHeight - 8) / HEIGHT)));
      c.style.width = `${WIDTH * s}px`;
      c.style.height = `${HEIGHT * s}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [scene]);

  /* ── 플레이 시간 ───────────────────────────────────────────── */
  useEffect(() => {
    if (scene !== 'world') return;
    const id = setInterval(() => { stateRef.current.playtime += 1000; }, 1000);
    return () => clearInterval(id);
  }, [scene]);

  const persist = useCallback(() => {
    const w = worldRef.current;
    if (w) {
      const { x, y, dir } = w.pos;
      stateRef.current = { ...stateRef.current, map: w.map.id, x, y, dir };
    }
    save(stateRef.current);
    setHasSave(true);
  }, []);

  /* ── 시작 ─────────────────────────────────────────────────── */
  const start = useCallback((fresh) => {
    const s = fresh ? createState() : (load() ?? createState());
    if (fresh) clearSave();
    stateRef.current = s;
    const spawn = MAPS[s.map]?.spawn ?? { x: 0, y: 0, dir: 'down' };
    const at = fresh ? spawn : { x: s.x, y: s.y, dir: s.dir };
    worldRef.current = createWorld(s.map, { ...s, ...at }, { onEvent: handleWorldEvent });
    setScene('world');
    if (fresh) setTimeout(() => runScript('lab.open'), 60);
    forceUI();
  }, [handleWorldEvent, runScript]);

  /* ── 배틀 종료 ─────────────────────────────────────────────── */
  const endBattle = useCallback(({ result, party, caught }) => {
    let s = { ...stateRef.current, party };
    if (caught) s = addMon(s, caught, 5);
    stateRef.current = s;
    setBattle(null);
    persist();
    // 스크립트 도중의 배틀이었으면 이어서 진행합니다.
    if (runnerRef.current) setTimeout(() => advance(), 40);
    forceUI();
  }, [advance, persist]);

  /* ── 렌더 ─────────────────────────────────────────────────── */
  if (scene === 'title') {
    return <TitleScreen onStart={() => start(true)} hasSave={hasSave} onContinue={() => start(false)} />;
  }

  if (scene === 'hall') {
    return <HallOfFame state={stateRef.current} onCredits={() => setScene('credits')} />;
  }

  if (scene === 'credits') return <Credits state={stateRef.current} onTitle={() => setScene('title')} />;

  const st = stateRef.current;
  return (
    <div className="stage">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} aria-label="게임 화면" />

      {!boot.done && <div className="boot"><p>불러오는 중… {Math.round(boot.pct * 100)}%</p></div>}
      {banner && <Banner text={banner} onDone={() => { setBanner(null); advance(); }} />}

      {battle && (
        <Battle spec={battle} party={st.party} onEnd={endBattle} />
      )}

      {!battle && step?.kind === 'text' && (
        <DialogueBox who={step.who} text={step.t} onNext={advance} />
      )}
      {!battle && step?.kind === 'choose' && (
        <DialogueBox who={null} text="" showNext={false}>
          <Choices options={step.options} onPick={(i) => {
            const r = runnerRef.current;
            if (!r) return;
            const n = r.pick(step, i);
            setStep(null);
            queueMicrotask(() => handleStep(n));
          }} />
        </DialogueBox>
      )}
      {!battle && step?.kind === 'input' && (
        <DialogueBox who={null} text="이름을 입력해 주세요." showNext={false}>
          <NameInput onSubmit={(v) => {
            const r = runnerRef.current;
            if (!r) return;
            const n = r.answer('name', v);
            setStep(null);
            queueMicrotask(() => handleStep(n));
          }} />
        </DialogueBox>
      )}

      {overlay === 'dex' && <Dex state={st} onClose={() => setOverlay(null)} />}
      {overlay === 'menu' && (
        <Menu state={st} onClose={() => setOverlay(null)} onSelect={(k) => {
          if (k === 'dex') setOverlay('dex');
          else if (k === 'save') { persist(); setOverlay(null); }
          else if (k === 'resume') window.open('/resume', '_blank');
          else if (k === 'card') setOverlay(null);
        }} />
      )}

      <TouchPad
        onDir={(d, down) => { if (down) worldRef.current?.press(d); }}
        onA={() => (step ? advance() : handleWorldEvent(worldRef.current?.interact()))}
        onB={() => setOverlay(null)}
        onMenu={() => setOverlay((v) => (v ? null : 'menu'))}
      />

      {boot.done && <p className="hud">{boot.backend}{boot.missing ? ` · 자리표시자 ${boot.missing}장` : ''}</p>}
    </div>
  );

  /* 선택지·이름 입력 뒤에는 러너가 이미 한 걸음 나아가 있어, pump 대신 그 결과를 직접 씁니다. */
  function handleStep(s) {
    if (!s) return;
    if (s.kind === 'done') { runnerRef.current = null; setStep(null); persist(); return; }
    if (s.kind === 'battle') { setBattle(s.battle); return; }
    if (s.kind === 'scene') { runnerRef.current = null; setScene(s.scene); return; }
    if (s.kind === 'banner') { setBanner(s.text); return; }
    if (s.kind === 'warp') { doWarp(s.warp); return advance(); }
    if (s.kind === 'fx' || s.kind === 'wait') return advance();
    setStep(s);
  }
}

/** 인카운터 레벨은 지금까지 잡은 수에 맞춥니다 — 뒤 맵에서 5레벨이 나오면 맥이 빠집니다. */
function encounterLevel(s) {
  return Math.min(48, 5 + s.dex.length * 2 + s.badges.length * 4);
}

const BG_BY_MAP = { 'night-office': 2, 'wave-harbor': 3, 'share-village': 4, 'zivo-tower': 5, 'zivo-city': 5 };
const bgFor = (id) => BG_BY_MAP[id] ?? 1;

function Credits({ state, onTitle }) {
  return (
    <div className="credits">
      <div className="roll">
        <h2>포켓레주메</h2>
        <p className="lead">
          “기술 스택이 많은 개발자”보다<br />
          <strong>“문제를 만나면 필요한 기술을 연결해서 실제 서비스까지 만드는 개발자”</strong>
        </p>
        <dl>
          <div><dt>기획 · 개발 · 아트디렉션</dt><dd>박상욱 (iron)</dd></div>
          <div><dt>마스코트</dt><dd>Ai-ng (아잉)</dd></div>
          <div><dt>렌더러</dt><dd>WebGPU · WebGL2 · Canvas2D 폴백</dd></div>
          <div><dt>프레임워크</dt><dd>Next.js 16.3 App Router · React 19</dd></div>
          <div><dt>지면 타일</dt><dd>절차 생성 (오토타일 16종)</dd></div>
        </dl>
        <p className="contact">
          <a href="mailto:sangwookp9591@gmail.com">sangwookp9591@gmail.com</a><br />
          <a href="https://github.com/sangwookp9591">github.com/sangwookp9591</a><br />
          <a href="/iron.md">이력서 전문 (Markdown)</a>
        </p>
        <p className="thanks">플레이해 주셔서 고맙습니다. — {state.name || '아이언'}</p>
        <button className="primary" onClick={onTitle}>타이틀로</button>
      </div>
    </div>
  );
}
