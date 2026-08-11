import type { MetadataRoute } from 'next';
import { SITE } from '../lib/markdown.ts';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date('2026-08-11');
  return ['', '/resume', '/iron.md', '/llms.txt'].map((p) => ({
    url: `${SITE.url}${p}`,
    lastModified: now,
    priority: p === '' ? 1 : 0.7,
  }));
}
