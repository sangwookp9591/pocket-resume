import { JOURNEY, BADGES } from '../../content/journey.ts';
import { MONS, TYPES } from '../../content/mons.ts';
import { WIKI } from '../../content/wiki.ts';
import { SITE } from '../../lib/markdown.ts';
import { resumeJsonLd } from '../../lib/jsonld.ts';
import type { Metadata } from 'next';
import './resume.css';

export const metadata: Metadata = {
  title: '박상욱(iron) — 이력서',
  description: SITE.tagline,
  alternates: { canonical: '/resume' },
};

/* 게임을 못 하는(또는 안 하는) 사람을 위한 이력서 전문.
   본문은 게임과 **같은 상수**에서 나옵니다 — 어긋날 사본이 없습니다. */
export default function Resume() {
  return (
    <main className="resume">
      <script type="application/ld+json" suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(resumeJsonLd()) }} />

      <header>
        <p className="eyebrow">이력서</p>
        <h1>박상욱 <span>iron</span></h1>
        <p className="tagline">
          “기술 스택이 많은 개발자”보다<br />
          <strong>“문제를 만나면 필요한 기술을 연결해서 실제 서비스까지 만드는 개발자”</strong>
        </p>
        <ul className="links">
          <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
          <li><a href={SITE.github}>GitHub</a></li>
          <li><a href="/iron.md">Markdown 전문</a></li>
          <li><a href="/">게임으로 플레이 →</a></li>
        </ul>
      </header>

      <section>
        <h2>네 회사의 일대기</h2>
        {JOURNEY.map((j) => (
          <article key={j.id} className="chapter">
            <h3><span className="n">{j.n}</span> {j.place} — {j.headline}</h3>
            <p className="story">{j.story.trim()}</p>
            <p className="lesson">{j.lesson}</p>
            <p className="meta">
              <span className="badge" style={{ background: BADGES[j.badge].hue }}>{BADGES[j.badge].name}</span>
              <span className="gets">{j.gets.map((id) => MONS.find((m) => m.id === id)?.en).filter(Boolean).join(' · ')}</span>
              <span className="ev">{j.evidence === 'git' ? 'git 이력 분석' : '본인 진술'}</span>
            </p>
          </article>
        ))}
      </section>

      <section>
        <h2>기술 도감 <small>{MONS.length}종</small></h2>
        <p className="note">게임의 도감이 곧 이력서입니다. 설명은 전부 실제 이력에서 왔습니다.</p>
        <div className="dexgrid">
          {MONS.map((m) => (
            <article key={m.id} className="dexcard">
              <h3>
                <span className="no">{String(m.no).padStart(2, '0')}</span>
                {m.en}
                <span className="chip" style={{ background: TYPES[m.type].color, color: TYPES[m.type].ink }}>
                  {TYPES[m.type].name}
                </span>
              </h3>
              <p>{m.dex}</p>
              <ul>{m.moves.map((mv) => <li key={mv}>{mv}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>상세</h2>
        {WIKI.map((w) => (
          <article key={w.id} className="wiki">
            <h3>{w.title}</h3>
            <p>{w.text.trim()}</p>
          </article>
        ))}
      </section>

      <footer>
        <p>{SITE.email} · <a href={SITE.github}>github.com/sangwookp9591</a></p>
        <p className="small">
          에이전트라면 <a href="/llms.txt">/llms.txt</a> · <a href="/iron.md">/iron.md</a>를 쓰세요.
        </p>
      </footer>
    </main>
  );
}
