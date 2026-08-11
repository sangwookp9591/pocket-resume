/* 이력서 전문을 content/에서 생성합니다. **사본을 만들지 않기 위해서입니다** —
   게임의 도감과 /resume 페이지와 /iron.md가 같은 상수에서 나오므로 어긋날 수가 없습니다. */

import { WIKI } from '../content/wiki.ts';
import { JOURNEY, BADGES } from '../content/journey.ts';
import { MONS, TYPES } from '../content/mons.ts';

export const SITE = {
  name: '포켓레주메',
  who: '박상욱 (iron)',
  email: 'sangwookp9591@gmail.com',
  github: 'https://github.com/sangwookp9591',
  url: 'https://pocket-resume.vercel.app',
  tagline: '문제를 만나면 필요한 기술을 연결해서 실제 서비스까지 만드는 개발자',
};

const wiki = (id: string) => WIKI.find((w) => w.id === id);

export function resumeMarkdown(): string {
  const L: string[] = [];
  L.push(`# ${SITE.who}`, '', `> ${SITE.tagline}`, '');
  L.push(`- 메일: ${SITE.email}`, `- GitHub: ${SITE.github}`, `- 이 문서의 게임판: ${SITE.url}`, '');
  L.push('---', '', '## 한 줄', '');
  L.push('"기술 스택이 많은 개발자"보다 **"문제를 만나면 필요한 기술을 연결해서 실제 서비스까지 만드는 개발자"**.', '');

  L.push('---', '', '## 네 회사의 일대기', '');
  for (const j of JOURNEY) {
    L.push(`### ${j.n}. ${j.place} — ${j.headline}`, '');
    L.push(j.story.trim(), '');
    L.push(`**배운 것**: ${j.lesson}`, '');
    L.push(`**얻은 기술**: ${j.gets.map((id) => MONS.find((m) => m.id === id)?.en ?? id).join(' · ')}`, '');
    L.push(`**근거 등급**: ${j.evidence === 'git' ? 'git 이력 분석' : '본인 진술'}`, '');
  }

  L.push('---', '', '## 기술 도감', '');
  L.push('게임의 도감이 곧 이력서입니다. 설명은 전부 실제 이력에서 왔습니다.', '');
  for (const m of MONS) {
    L.push(`### ${String(m.no).padStart(2, '0')}. ${m.en} — ${m.name}`, '');
    L.push(`- 분류: ${TYPES[m.type].name} · ${m.where}번째 회사`);
    L.push(`- 기술: ${m.moves.join(' · ')}`, '');
    L.push(m.dex, '');
  }

  L.push('---', '', '## 상세 (PAR)', '');
  for (const w of WIKI) {
    if (w.id === 'caution') continue;
    L.push(`### ${w.title}`, '', w.text.trim(), '');
  }

  const c = wiki('caution');
  if (c) L.push('---', '', `## ${c.title}`, '', c.text.trim(), '');

  L.push('---', '', '## 배지', '');
  for (const [, b] of Object.entries(BADGES)) L.push(`- **${b.name}** (${b.from}) — ${b.got}`);
  L.push('');

  return L.join('\n');
}

export function llmsTxt(): string {
  return [
    `# ${SITE.who}`,
    '',
    `> ${SITE.tagline}`,
    '',
    '## 문서',
    `- [이력서 전문](${SITE.url}/iron.md): PAR 형식 이력서 전문 (Markdown)`,
    `- [정적 이력서](${SITE.url}/resume): 게임 없이 읽는 HTML 이력서`,
    `- [전문 묶음](${SITE.url}/llms-full.txt): 아래 문서 전체를 한 파일로`,
    '',
    '## 개요',
    wiki('who')?.text.trim() ?? '',
    '',
    '## 연락',
    `- ${SITE.email}`,
    `- ${SITE.github}`,
    '',
  ].join('\n');
}

export const llmsFull = () => `${llmsTxt()}\n---\n\n${resumeMarkdown()}`;
