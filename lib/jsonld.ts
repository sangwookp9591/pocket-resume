/* 구조화 데이터. **화면에 실제로 보이는 것만** 올립니다 —
   보이지 않는 내용을 JSON-LD로만 넣는 것은 스팸이고, 검색엔진도 그렇게 봅니다. */

import { SITE } from './markdown.ts';
import { JOURNEY } from '../content/journey.ts';
import { MONS } from '../content/mons.ts';
import { WIKI } from '../content/wiki.ts';

const person = () => ({
  '@type': 'Person',
  name: '박상욱',
  alternateName: ['iron', 'Sangwook Park'],
  email: `mailto:${SITE.email}`,
  url: SITE.url,
  sameAs: [SITE.github],
  jobTitle: '풀스택 개발자',
  description: SITE.tagline,
  knowsAbout: MONS.map((m) => m.en),
});

export function profileJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${SITE.name} — ${SITE.who}`,
    description: SITE.tagline,
    url: SITE.url,
    mainEntity: person(),
    hasPart: {
      '@type': 'ItemList',
      name: '네 회사의 일대기',
      itemListElement: JOURNEY.map((j, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${j.place} — ${j.headline}`,
        description: j.lesson,
      })),
    },
  };
}

export function resumeJsonLd() {
  return [
    { '@context': 'https://schema.org', '@type': 'ProfilePage', url: `${SITE.url}/resume`, mainEntity: person() },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: '기술 도감',
      itemListElement: MONS.map((m, i) => ({
        '@type': 'ListItem', position: i + 1, name: m.en, description: m.dex,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      // /resume에 실제로 그려지는 조각만 FAQ로 냅니다.
      mainEntity: WIKI.filter((w) => !w.overview).map((w) => ({
        '@type': 'Question',
        name: w.title,
        acceptedAnswer: { '@type': 'Answer', text: w.text.trim() },
      })),
    },
  ];
}
