'use client';

/* 배틀 화면. 로직은 lib/game/battle.js에 있고 여기는 그것을 보여 주기만 합니다.
   그래서 이 파일에는 규칙이 없습니다 — 규칙이 두 군데 있으면 반드시 어긋납니다. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initBattle, makeUnit, step, grantExp } from '../lib/game/battle.ts';
import { byId } from '../content/mons.ts';
import type { BattleSpec, PartyUnit } from '../content/types.ts';
import type { BattleState } from '../lib/game/battle.ts';
import { DialogueBox, TypeChip, PixelImg } from './ui.jsx';

const MENU: Array<[string, string]> = [
  ['move', '기술'],
  ['ball', '기술볼'],
  ['switch', '교체'],
  ['run', '도망'],
];

export default function Battle({ spec, party, onEnd }: {
  spec: BattleSpec;
  party: PartyUnit[];
  onEnd: (r: { result: BattleState['over']; party: PartyUnit[]; caught: string | null }) => void;
}) {
  const [st, setSt] = useState(() =>
    initBattle({
      playerParty: party.length ? party : [makeUnit('spring', 5)],
      wild: makeUnit(spec.mon, spec.level ?? 5),
      scripted: spec.scripted ?? null,
      intro: spec.intro ?? `야생의 ${byId[spec.mon]?.name ?? spec.mon}(이)가 나타났다!`,
      bg: spec.bg ?? 1,
    }),
  );
  const [shown, setShown] = useState(0); // 몇 번째 로그까지 읽었나
  const [mode, setMode] = useState('log'); // log | menu | moves | switch
  const [cur, setCur] = useState(0);
  const endedRef = useRef(false);

  const me = st.party[st.active]!;
  const log = st.log;
  const reading = shown < log.length;

  const act = useCallback((kind: 'move' | 'ball' | 'run' | 'switch', idx?: number) => {
    setSt((s) => {
      const n = step(s, { kind, idx } as Parameters<typeof step>[1]);
      return n;
    });
    setMode('log');
  }, []);

  // 로그를 다 읽었고 배틀이 끝났으면 결과를 올려보냅니다.
  useEffect(() => {
    if (reading || !st.over || endedRef.current) return;
    endedRef.current = true;
    const t = setTimeout(() => {
      const party2 = st.over === 'won' || st.over === 'caught'
        ? st.party.map((u, i) => (i === st.active ? grantExp(u, st.foe) : u))
        : st.party;
      onEnd({ result: st.over, party: party2, caught: st.over === 'caught' ? st.foe.id : null });
    }, 700);
    return () => clearTimeout(t);
  }, [reading, st, onEnd]);

  useEffect(() => {
    if (mode !== 'log' || reading || st.over) return;
    setMode('menu');
  }, [mode, reading, st.over]);

  const options = useMemo(() => {
    if (mode === 'menu') return MENU.map(([k, label]) => ({ k, label, dim: false }));
    if (mode === 'moves') return me.mon.moves.map((m, i) => ({ k: String(i), label: m, dim: false }));
    if (mode === 'switch') {
      return st.party.map((u, i) => ({
        k: String(i), label: `${u.mon.name} Lv.${u.level} (${u.hp}/${u.maxHp})`, dim: u.hp <= 0 || i === st.active,
      }));
    }
    return [];
  }, [mode, me, st.party, st.active]);

  useEffect(() => setCur(0), [mode]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (reading || st.over) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') { e.preventDefault(); setShown((v) => Math.min(log.length, v + 1)); }
        return;
      }
      if (!options.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') setCur((v) => (v + 1) % options.length);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') setCur((v) => (v - 1 + options.length) % options.length);
      else if (e.key === 'Escape' || e.key === 'x') setMode('menu');
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') { e.preventDefault(); choose(cur); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  function choose(i: number) {
    const o = options[i];
    if (!o || o.dim) return;
    if (mode === 'menu') {
      if (o.k === 'move') setMode('moves');
      else if (o.k === 'switch') setMode('switch');
      else act(o.k as 'ball' | 'run');
      return;
    }
    if (mode === 'moves') act('move', Number(o.k));
    if (mode === 'switch') act('switch', Number(o.k));
  }

  const line = log[Math.min(shown, log.length - 1)] ?? '';

  return (
    <div className="battle">
      <PixelImg className="battle-bg" src={`/game/bg/battle-${st.bg}.webp`} aria-hidden />

      <div className="field">
        <Slot unit={st.foe} foe />
        <Slot unit={me} />
      </div>

      <div className="battle-ui">
        {reading || st.over ? (
          <DialogueBox text={line} onNext={() => setShown((v) => Math.min(log.length, v + 1))} />
        ) : (
          <div className="battle-menu">
            <p className="prompt">{mode === 'menu' ? `${me.mon.name}(은)는 무엇을 할까?` : mode === 'moves' ? '기술 선택' : '교체할 기술'}</p>
            <ul>
              {options.map((o, i) => (
                <li key={o.k}>
                  <button className={`${i === cur ? 'on' : ''} ${o.dim ? 'dim' : ''}`}
                    onMouseEnter={() => setCur(i)} onClick={() => choose(i)} disabled={o.dim}>
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
            {mode !== 'menu' && <button className="back" onClick={() => setMode('menu')}>← 돌아가기</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function Slot({ unit, foe }: { unit: PartyUnit; foe?: boolean }) {
  const pct = Math.max(0, Math.round((unit.hp / unit.maxHp) * 100));
  const hue = pct > 50 ? '#7FA65C' : pct > 20 ? '#F2C94C' : '#F2814F';
  return (
    <div className={`slot ${foe ? 'foe' : 'mine'}`}>
      <div className="hpbox">
        <div className="hpname">
          <strong>{unit.mon.name}</strong>
          <TypeChip t={unit.mon.type} />
          <span className="lv">Lv.{unit.level}</span>
        </div>
        <div className="hpbar"><i style={{ width: `${pct}%`, background: hue }} /></div>
        {!foe && <span className="hpnum">{unit.hp} / {unit.maxHp}</span>}
      </div>
      <PixelImg className="sprite" src={`/game/mon/${unit.id}.webp`} alt={unit.mon.name} width={96} height={96} />
    </div>
  );
}
