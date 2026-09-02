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
  Only root-absolute values are rewritten. Fragments (#guilloche — the SVG
  <use> reference), mailto:, tel: and absolute URLs all start with something
  other than "/" and are left alone. The negative lookahead stops a second
  run from double-prefixing.
*/
const slug = base.slice(1);
const attrPattern = new RegExp(`(href|src)="/(?!${slug}/)`, 'g');

/*
  srcset needs separate handling: it holds a comma-separated list of
  "url descriptor" pairs, so a single attribute contains many URLs and the
  attribute-level regex above only ever sees the first.

  Missing this is silent — the <img src> fallback still resolves, so images
  appear and the page looks correct, while every responsive AVIF and WebP
  candidate 404s and browsers quietly fall back to the largest JPEG.
*/
const srcsetPattern = /(srcset|imagesrcset)="([^"]*)"/g;
const urlInSrcset = new RegExp(`(^|,\\s*)/(?!${slug}/)`, 'g');

let files = 0;
let edits = 0;
for (const file of walk(DIST)) {
  if (!REWRITABLE.has(extname(file))) continue;
  const before = readFileSync(file, 'utf8');

  let after = before.replace(attrPattern, (_m, attr) => {
    edits++;
    return `${attr}="${base}/`;
  });

  after = after.replace(srcsetPattern, (_m, attr, value) => {
    const rewritten = value.replace(urlInSrcset, (_x, lead) => {
      edits++;
      return `${lead}${base}/`;
    });
    return `${attr}="${rewritten}"`;
  });

  if (after !== before) {
    writeFileSync(file, after);
    files++;
  }
}

/*
  Guard. Anything still pointing at a root-absolute build asset would 404 on
  Pages, so fail the build rather than deploy a site that looks fine and
  silently serves the wrong files.
*/
const leaks = [];
for (const file of walk(DIST)) {
  if (!REWRITABLE.has(extname(file))) continue;
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/["'\s]\/_astro\/[^"'\s,]+/g)) {
    leaks.push(`${file}: ${m[0].trim()}`);
  }
}
if (leaks.length) {
  console.error(`\nUnrebased asset references (${leaks.length}) — these would 404 on Pages:`);
  for (const l of leaks.slice(0, 8)) console.error(`  ${l}`);
  process.exit(1);
}

// Stop Jekyll eating /_astro/.
writeFileSync(join(DIST, '.nojekyll'), '');

console.log(`rebased to ${base}/ — ${edits} references across ${files} files`);
console.log('wrote dist/.nojekyll');
