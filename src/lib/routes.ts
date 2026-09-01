import { getCollection } from 'astro:content';

/*
  Which routes actually exist right now.

  The site links to its own future — the footer, the homepage service grid
  and every "related pathways" block all reference pages that are planned
  but not yet written. Rather than maintain those lists by hand and ship
  404s whenever one drifts, every link destination is checked against the
  content collections at build time.

  A link to a page that exists renders as a link. One that doesn't renders
  as inert, muted text marked "in preparation". Nothing 404s, and pages
  light up automatically the moment their content file lands.
*/

/** Routes that come from .astro files rather than a collection. */
const STATIC_ROUTES = ['/', '/about/', '/assessment/', '/contact/'] as const;

let cache: Set<string> | null = null;

export async function builtRoutes(): Promise<Set<string>> {
  if (cache) return cache;

  const [visas, sections] = await Promise.all([
    getCollection('visas'),
    getCollection('sections'),
  ]);

  cache = new Set<string>([
    ...STATIC_ROUTES,
    ...sections.map(s => `/${s.data.section}/`),
    ...visas.map(v => `/${v.data.section}/${v.id}/`),
  ]);
  return cache;
}

/** True when `href` is an internal route that has actually been built. */
export async function isBuilt(href: string): Promise<boolean> {
  // External links, mailto: and tel: are always fine to render as links.
  if (!href.startsWith('/')) return true;
  return (await builtRoutes()).has(href);
}

/** Annotate a list of links with whether each destination exists yet. */
export async function withBuiltFlag<T extends { href: string }>(
  links: T[],
): Promise<(T & { ready: boolean })[]> {
  const routes = await builtRoutes();
  return links.map(l => ({
    ...l,
    ready: !l.href.startsWith('/') || routes.has(l.href),
  }));
}
