import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';

/*
  Preview deploys are closed to crawlers entirely. The live site allows
  everything and points at the sitemap. Driven by the same PUBLIC_PREVIEW
  flag as the noindex meta tag in Base.astro, so the two cannot disagree.
*/
export const GET: APIRoute = () => {
  const isPreview = import.meta.env.PUBLIC_PREVIEW === 'true';

  const body = isPreview
    ? ['# Pre-launch preview — not for indexing', 'User-agent: *', 'Disallow: /', ''].join('\n')
    : ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE.url}/sitemap-index.xml`, ''].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
