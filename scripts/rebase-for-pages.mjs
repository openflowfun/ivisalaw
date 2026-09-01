/*
  Rewrites the built site to live under a subpath, for GitHub Pages.

  GitHub Pages serves a project repo at /<repo>/, not at the root. Astro's
  own `base` option would fix asset URLs, but not the ~25 internal link
  destinations that come from data arrays and markdown frontmatter — those
  would all 404. Rewriting the built HTML instead handles links and assets
  in one place and leaves the source (and the Cloudflare/production build)
  completely untouched.

  Also writes .nojekyll: without it GitHub Pages runs Jekyll, which ignores
  every directory beginning with an underscore — silently deleting /_astro/
  and serving the site with no CSS or JS at all.

  Usage: node scripts/rebase-for-pages.mjs <base>   e.g. /ivisalaw
*/
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!base.startsWith('/')) {
  console.error('Usage: node scripts/rebase-for-pages.mjs /repo-name');
  process.exit(1);
}

const DIST = 'dist';
const REWRITABLE = new Set(['.html', '.xml', '.txt']);

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/*
  Only root-absolute href/src values are rewritten. Fragments (#guilloche —
  the SVG <use> reference), mailto:, tel: and absolute URLs all start with
  something other than "/" and are left alone. The negative lookahead stops
  a second run from double-prefixing.
*/
const pattern = new RegExp(`(href|src)="/(?!${base.slice(1)}/)`, 'g');

let files = 0;
let edits = 0;
for (const file of walk(DIST)) {
  if (!REWRITABLE.has(extname(file))) continue;
  const before = readFileSync(file, 'utf8');
  const after = before.replace(pattern, (_m, attr) => {
    edits++;
    return `${attr}="${base}/`;
  });
  if (after !== before) {
    writeFileSync(file, after);
    files++;
  }
}

// Stop Jekyll eating /_astro/.
writeFileSync(join(DIST, '.nojekyll'), '');

console.log(`rebased to ${base}/ — ${edits} references across ${files} files`);
console.log('wrote dist/.nojekyll');
