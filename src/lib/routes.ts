import { getCollection } from 'astro:content';

/*
  Which routes actually exist right now.

  The site links to its own future — the footer, the homepage service grid
  and every "related pathways" block all reference pages that are planned
  but not yet written. Rather than maintain those lists by hand and ship
  404s whenever one drifts, every link destination is checked against the
  content collections at build time.

  Destinations resolve one of three ways:

    ready   the page exists — render a normal link
    parent  the page doesn't, but an ancestor section does — link there
            instead, labelled so the reader knows they are going to the
            section rather than the specific page
    pending nothing useful to link to — render inert, "in preparation"

  The `parent` case matters: "Employer accreditation" pointing at an
  unwritten /employers/accreditation/ is a dead card, but /employers/
  exists and genuinely answers part of the question. Sending people there
  beats greying the card out.
*/

/** Routes that come from .astro files rather than a collection. */
const STATIC_ROUTES = ['/', '/about/', '/assessment/', '/contact/'] as const;

let routeCache: Set<string> | null = null;
let labelCache: Map<string, string> | null = null;

async function load() {
  if (routeCache && labelCache) return { routes: routeCache, labels: labelCache };

  const [visas, sections] = await Promise.all([
    getCollection('visas'),
    getCollection('sections'),
  ]);

  routeCache = new Set<string>([
    ...STATIC_ROUTES,
    ...sections.map(s => `/${s.data.section}/`),
    ...visas.map(v => `/${v.data.section}/${v.id}/`),
  ]);

  labelCache = new Map(sections.map(s => [`/${s.data.section}/`, s.data.navLabel]));
  return { routes: routeCache, labels: labelCache };
}

export async function builtRoutes(): Promise<Set<string>> {
  return (await load()).routes;
}

export interface ResolvedLink {
  /** Where the link should actually point. Undefined when nothing exists. */
  href?: string;
  state: 'ready' | 'parent' | 'pending';
  /** Nav label of the ancestor, when state is 'parent'. */
  parentLabel?: string;
}

/**
 * Resolve one destination against what has been built.
 * `currentPath` stops a card on /employers/ linking back to /employers/.
 */
export async function resolveLink(href: string, currentPath?: string): Promise<ResolvedLink> {
  // External, mailto: and tel: always render as links.
  if (!href.startsWith('/')) return { href, state: 'ready' };

  const { routes, labels } = await load();
  if (routes.has(href)) return { href, state: 'ready' };

  // Walk up the path looking for a section that does exist.
  const parts = href.split('/').filter(Boolean);
  while (parts.length > 1) {
    parts.pop();
    const parent = `/${parts.join('/')}/`;
    if (routes.has(parent) && parent !== currentPath) {
      return { href: parent, state: 'parent', parentLabel: labels.get(parent) };
    }
  }

  return { state: 'pending' };
}

/** Annotate a list of links with how each destination resolves. */
export async function withBuiltFlag<T extends { href: string }>(
  links: T[],
  currentPath?: string,
): Promise<(T & ResolvedLink & { ready: boolean })[]> {
  return Promise.all(
    links.map(async l => {
      const r = await resolveLink(l.href, currentPath);
      return { ...l, ...r, href: r.href ?? l.href, ready: r.state !== 'pending' };
    }),
  );
}
