import { resumeMarkdown } from '../../lib/markdown.ts';

export const dynamic = 'force-static';

export function GET() {
  return new Response(resumeMarkdown(), {
    headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
