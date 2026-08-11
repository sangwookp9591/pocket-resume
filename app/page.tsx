import Game from '../components/Game.tsx';
import './game.css';
import { profileJsonLd } from '../lib/jsonld.ts';

/* 게임은 클라이언트에서만 돕니다. 하지만 이 페이지가 **비어 있으면 안 됩니다** —
   JS를 돌리지 않는 크롤러와 에이전트에게는 이력서가 통째로 없는 것이 되기 때문입니다.
   그래서 서버에서 JSON-LD와 noscript 요약을 함께 냅니다. 본문은 /resume에 있습니다. */
export default function Home() {
  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd()) }} />
      <Game />
      <noscript>
        <div style={{ padding: '10vh 6vw', maxWidth: 720, margin: '0 auto', lineHeight: 1.8 }}>
          <h1>포켓레주메 — 박상욱(iron)</h1>
          <p>
            이 페이지는 방향키로 걸어 다니며 읽는 게임 형식의 이력서입니다.
            자바스크립트 없이 읽으시려면 <a href="/resume">이력서 전문</a>을 보세요.
            에이전트라면 <a href="/iron.md">/iron.md</a> 또는 <a href="/llms.txt">/llms.txt</a>를 쓰세요.
          </p>
        </div>
      </noscript>
    </>
  );
}
