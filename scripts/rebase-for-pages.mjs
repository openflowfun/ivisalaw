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
/* Origin the preview is actually served from, for absolute social URLs. */
const PREVIEW_ORIGIN = process.env.PREVIEW_ORIGIN || '';
/* .webmanifest matters: its icon paths are root-absolute too, and a manifest
   whose icons 404 is exactly the kind of thing nobody notices. .css is here
   for the @font-face sources — see cssUrlPattern below. */
const REWRITABLE = new Set(['.html', '.css', '.xml', '.txt', '.webmanifest', '.json']);

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
/* poster is on the list for the hero video: a <video poster> left at the
   root would 404 on the preview and leave a blank box until playback. */
const attrPattern = new RegExp(`(href|src|poster)="/(?!${slug}/)`, 'g');

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

/*
  CSS url() values are root-absolute too, and the self-hosted fonts live at
  /fonts/. Missing them is silent in the same way srcset was: the preload
  <link> is rebased and fetches the font, the @font-face rule asks for the
  old path and 404s, and the whole site renders in fallback system fonts.
  Found by Lighthouse on the preview, 5 Oct 2026. The quote is optional
  because minifiers drop it.
*/
const cssUrlPattern = new RegExp(`url\\((['"]?)/(?!/)(?!${slug}/)`, 'g');

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

  // Stylesheets, plus <style> blocks and style attributes Astro inlines.
  if (extname(file) === '.css' || extname(file) === '.html') {
    after = after.replace(cssUrlPattern, (_m, quote) => {
      edits++;
      return `url(${quote}${base}/`;
    });
  }

  /*
    og:image and twitter:image are absolute URLs to the production domain,
    which does not serve this build yet — so a preview link shared to
    WhatsApp would render the blank card this work was meant to fix. Point
    them at the preview origin instead. Only the preview build is touched;
    the production build keeps the real domain.
  */
  /*
    The web manifest is JSON, so its paths are `"src": "/icon-192.png"` and the
    attribute regex above never sees them. Rewriting the keys that hold a path
    keeps the installed-icon set from 404ing.
  */
  if (extname(file) === '.webmanifest' || extname(file) === '.json') {
    after = after.replace(
      new RegExp(`("(?:src|start_url|scope)"\\s*:\\s*")/(?!${slug}/)`, 'g'),
      (_m, lead) => { edits++; return `${lead}${base}/`; },
    );
  }

  if (PREVIEW_ORIGIN) {
    after = after.replace(
      /(<meta (?:property|name)="(?:og:image|twitter:image)" content=")https?:\/\/[^/"]+/g,
      `$1${PREVIEW_ORIGIN}${base}`,
    );
  }

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
  /* Any root-absolute href/src/poster left behind would 404 too. The /_astro/
     check above predates the video, and would not have caught /video/ or
     /fonts/ — so look at the attributes themselves. Protocol-relative URLs
     ("//") are external and fine. */
  for (const m of html.matchAll(new RegExp(`\\b(href|src|poster)="/(?!/)(?!${slug}/)[^"]*"`, 'g'))) {
    leaks.push(`${file}: ${m[0]}`);
  }
  /* The attribute check cannot see CSS, which is how the fonts got through. */
  for (const m of html.matchAll(new RegExp(`url\\((['"]?)/(?!/)(?!${slug}/)[^)]*\\)`, 'g'))) {
    leaks.push(`${file}: ${m[0]}`);
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
