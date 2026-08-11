import { SITE } from '../lib/markdown.js';

/* 와일드카드만 두면 색인을 건너뛰는 봇이 있어서 이름으로 허용합니다. */
const AGENTS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Googlebot',
  'Bingbot', 'Applebot', 'Applebot-Extended', 'CCBot', 'meta-externalagent',
];

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/' }, ...AGENTS.map((userAgent) => ({ userAgent, allow: '/' }))],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
