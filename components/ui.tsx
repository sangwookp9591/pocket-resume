'use client';

/* 화면 위에 얹히는 것들. 전부 DOM입니다 — 캔버스에 글자를 그리지 않습니다.
   그래야 확대해도 안 뭉개지고, 스크린리더가 읽고, 복사가 됩니다. */

import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { MONS, TYPES, byId } from '../content/mons.ts';
import { BADGES } from '../content/journey.ts';
import { card } from '../lib/game/state.ts';
import type { BadgeId, Face, GameState, TypeId } from '../content/types.ts';

/* 아직 안 만들어진 에셋은 **깨진 이미지 아이콘 대신 아무것도** 보여 줍니다.
   onError에서 style을 만지면 리렌더에 되살아나므로 상태로 기억합니다. */
export function PixelImg({ src, alt = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [dead, setDead] = useState(false);
  if (dead) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onError={() => setDead(true)} {...rest} />;
}

/* ── 대화창 ─────────────────────────────────────────────────────
   포켓몬의 그 창. 글자가 한 자씩 찍히고, 다 찍히기 전에 누르면 즉시 전부 나옵니다. */
export function DialogueBox({ who, text, onNext, showNext = true, children }: {
  who?: string | null;
  text?: string;
  onNext?: () => void;
  showNext?: boolean;
  children?: ReactNode;
}) {
  const [shown, setShown] = useState('');
  const full = text ?? '';
  const doneRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(full);
      doneRef.current = true;
      return;
    }
    setShown('');
    doneRef.current = false;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(full.slice(0, i));
      if (i >= full.length) {
        doneRef.current = true;
        clearInterval(id);
      }
    }, 22);
    return () => clearInterval(id);
  }, [full]);

  const advance = () => {
    if (!doneRef.current) {
      setShown(full);
      doneRef.current = true;
      return;
    }
    onNext?.();
  };

  return (
    <div className="dlg" onClick={advance} role="button" tabIndex={0} aria-live="polite"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); } }}>
      {who && <span className="dlg-who">{who}</span>}
      <p className="dlg-text">{shown}</p>
      {children}
      {showNext && doneRef.current && <span className="dlg-next" aria-hidden>▼</span>}
    </div>
  );
}

/* ── 선택지 ──────────────────────────────────────────────────── */
export function Choices({ options, onPick }: {
  options: Array<{ label: string; desc?: string | null }>;
  onPick: (i: number) => void;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's') setI((v) => (v + 1) % options.length);
      else if (e.key === 'ArrowUp' || e.key === 'w') setI((v) => (v - 1 + options.length) % options.length);
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') { e.preventDefault(); onPick(i); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [i, options.length, onPick]);

  return (
    <ul className="choices" role="listbox" aria-label="선택지">
      {options.map((o, n) => (
        <li key={o.label} role="option" aria-selected={n === i}>
          <button className={n === i ? 'on' : ''} onMouseEnter={() => setI(n)} onClick={() => onPick(n)}>
            <span className="cursor" aria-hidden>{n === i ? '▶' : ' '}</span>
            <span>{o.label}</span>
            {o.desc && <em>{o.desc}</em>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ── 이름 입력 ───────────────────────────────────────────────── */
export function NameInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form className="name-form" onSubmit={(e) => { e.preventDefault(); onSubmit(v.trim() || '아이언'); }}>
      <label htmlFor="pname">이름</label>
      <input id="pname" ref={ref} value={v} maxLength={8} autoComplete="off"
        onChange={(e) => setV(e.target.value)} placeholder="아이언" />
      <button type="submit">결정</button>
    </form>
  );
}

/* ── 지명 배너 ───────────────────────────────────────────────── */
export function Banner({ text, onDone }: { text: string; onDone?: () => void }) {
  useEffect(() => {
    const id = setTimeout(() => onDone?.(), 1700);
    return () => clearTimeout(id);
  }, [onDone]);
  return <div className="banner" role="status">{text}</div>;
}

/* ── 도감 — 이것이 곧 이력서입니다 ────────────────────────────── */
export function Dex({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [sel, setSel] = useState(0);
  const owned = MONS.filter((m) => state.dex.includes(m.id));
  const list = MONS;
  const cur = list[sel];
  const has = state.dex.includes(cur.id);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') setSel((v) => Math.min(list.length - 1, v + 1));
      else if (e.key === 'ArrowUp') setSel((v) => Math.max(0, v - 1));
      else if (e.key === 'Escape' || e.key === 'x' || e.key === 'Tab') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [list.length, onClose]);

  return (
    <div className="panel dex">
      <header>
        <h2>기술 도감</h2>
        <span>{owned.length} / {MONS.length}</span>
        <button onClick={onClose} aria-label="닫기">✕</button>
      </header>
      <div className="dex-body">
        <ol className="dex-list">
          {list.map((m, i) => {
            const own = state.dex.includes(m.id);
            return (
              <li key={m.id}>
                <button className={i === sel ? 'on' : ''} onClick={() => setSel(i)} aria-current={i === sel}>
                  <span className="no">{String(m.no).padStart(3, '0')}</span>
                  <span className={own ? '' : 'locked'}>{own ? m.name : '─────'}</span>
                  {own && <TypeChip t={m.type} />}
                </button>
              </li>
            );
          })}
        </ol>
        <article className="dex-detail">
          {has ? (
            <>
              <h3>{cur.name} <small>{cur.en}</small></h3>
              <div className="row"><TypeChip t={cur.type} /><span className="where">{cur.where}번째 회사</span></div>
              <PixelImg src={`/game/mon/${cur.id}.webp`} width={96} height={96} />
              <p className="dexline">{cur.dex}</p>
              <p className="flavor">“{cur.flavor}”</p>
              <ul className="moves">{cur.moves.map((mv) => <li key={mv}>{mv}</li>)}</ul>
            </>
          ) : (
            <p className="locked-msg">아직 만나지 않은 기술입니다.</p>
          )}
        </article>
      </div>
    </div>
  );
}

export function TypeChip({ t }: { t: TypeId }) {
  const ty = TYPES[t];
  return <span className="chip" style={{ background: ty.color, color: ty.ink }}>{ty.name}</span>;
}

/* ── 메뉴 ───────────────────────────────────────────────────── */
export function Menu({ state, onSelect, onClose }: {
  state: GameState;
  onSelect: (k: string) => void;
  onClose: () => void;
}) {
  const c = card(state);
  const items: Array<[string, string]> = [['dex', '기술 도감'], ['card', '트레이너 카드'], ['resume', '이력서로 보기'], ['save', '저장'], ['close', '닫기']];
  return (
    <div className="panel menu">
      <header><h2>메뉴</h2><button onClick={onClose} aria-label="닫기">✕</button></header>
      <div className="card">
        <strong>{c.name}</strong>
        <dl>
          <div><dt>도감</dt><dd>{c.dex}</dd></div>
          <div><dt>플레이</dt><dd>{c.playtime}</dd></div>
          <div><dt>걸음</dt><dd>{c.steps}</dd></div>
        </dl>
        <ul className="badges">
          {(Object.entries(BADGES) as Array<[BadgeId, { name: string; hue: string; got: string }]>).map(([id, b]) => (
            <li key={id} className={state.badges.includes(id) ? 'on' : ''}
              style={state.badges.includes(id) ? { background: b.hue } : undefined} title={`${b.name} — ${b.got}`}>
              {state.badges.includes(id) ? b.name[0] : '·'}
            </li>
          ))}
        </ul>
      </div>
      <ul className="menu-list">
        {items.map(([k, label]) => (
          <li key={k}><button onClick={() => (k === 'close' ? onClose() : onSelect(k))}>{label}</button></li>
        ))}
      </ul>
    </div>
  );
}

/* ── 타이틀 ─────────────────────────────────────────────────── */
export function TitleScreen({ onStart, hasSave, onContinue }: {
  onStart: () => void;
  hasSave: boolean;
  onContinue: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (hasSave ? onContinue : onStart)(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [hasSave, onStart, onContinue]);

  return (
    <div className="title">
      <PixelImg className="title-bg" src="/game/bg/title.webp" aria-hidden />
      <div className="title-inner">
        <p className="eyebrow">박상욱 · iron</p>
        <h1>포켓<span>레주메</span></h1>
        <p className="sub">기술을 몇 개 잡았는지가 아니라, 그걸로 무엇을 끝냈는지에 대한 이야기</p>
        <div className="title-btns">
          {hasSave && <button className="primary" onClick={onContinue}>이어하기</button>}
          <button className={hasSave ? '' : 'primary'} onClick={onStart}>처음부터</button>
          <a className="link" href="/resume">게임 대신 이력서로 읽기 →</a>
        </div>
        <p className="hint">방향키 이동 · Z/Enter 확인 · X 취소 · Shift 달리기 · Tab 메뉴</p>
      </div>
    </div>
  );
}

/* ── 명예의 전당 ─────────────────────────────────────────────── */
export function HallOfFame({ state, onCredits }: { state: GameState; onCredits: () => void }) {
  const owned = state.dex.map((id) => byId[id]).filter(Boolean);
  return (
    <div className="hall">
      <h2>명예의 전당</h2>
      <p className="hall-name">{state.name || '아이언'}</p>
      <ul className="hall-mons">
        {owned.map((m) => (
          <li key={m.id}>
            <PixelImg src={`/game/mon/${m.id}.webp`} width={64} height={64} />
            <span>{m.name}</span>
          </li>
        ))}
      </ul>
      <p className="hall-line">
        기술 {owned.length}개가 등록되었습니다.<br />
        <strong>그리고 그 목록은 이 사람이 누구인지 말해 주지 않습니다.</strong>
      </p>
      <button className="primary" onClick={onCredits}>계속</button>
    </div>
  );
}

/* ── 터치 D-pad. 모바일에서 방향키가 없습니다 ─────────────────── */
export function TouchPad({ onDir, onA, onB, onMenu }: {
  onDir: (d: 'up' | 'down' | 'left' | 'right', down: boolean) => void;
  onA: () => void;
  onB: () => void;
  onMenu: () => void;
}) {
  const hold = (d: 'up' | 'down' | 'left' | 'right') => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); onDir(d, true); },
    onPointerUp: () => onDir(d, false),
    onPointerLeave: () => onDir(d, false),
    onPointerCancel: () => onDir(d, false),
  });
  return (
    <div className="pad" aria-hidden>
      <div className="dpad">
        <button className="u" {...hold('up')}>▲</button>
        <button className="l" {...hold('left')}>◀</button>
        <button className="r" {...hold('right')}>▶</button>
        <button className="d" {...hold('down')}>▼</button>
      </div>
      <div className="ab">
        <button className="b" onPointerDown={onB}>B</button>
        <button className="a" onPointerDown={onA}>A</button>
        <button className="m" onPointerDown={onMenu}>≡</button>
      </div>
    </div>
  );
}
