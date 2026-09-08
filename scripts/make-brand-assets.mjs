/*
  Generates the raster brand assets that cannot be produced at request time:
  the PNG favicons Safari and Android still want, and the Open Graph card.

  Run once and commit the output. Doing it at build time would mean depending
  on Newsreader and Public Sans being installed as system fonts on whatever
  machine runs the build, which they are not — so the wordmark here is drawn
  as vectors rather than set as text.

  Usage: node scripts/make-brand-assets.mjs
*/
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';

mkdirSync('public', { recursive: true });

/* ── favicons, from the same SVG the browser gets ────────────────── */
const favicon = readFileSync('public/favicon.svg');
for (const size of [32, 180, 192, 512]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  await sharp(favicon, { density: 400 }).resize(size, size).png().toFile(`public/${name}`);
  console.log(`public/${name}  ${size}x${size}`);
}

/* ── Open Graph card ─────────────────────────────────────────────────
   1200x630. Links shared to WhatsApp, Facebook and LinkedIn currently
   render blank, and for this audience those are the channels that matter.

   The wordmark is vector: an indigo panel, the same skewed "i" as the
   favicon, and VISALAW drawn as rectangles so it needs no font at all.  */
const W = 1200, H = 630;

const letters = {
  V: 'M0 0 L7 0 L14 26 L21 0 L28 0 L18 34 L10 34 Z',
  I: 'M0 0 L7 0 L7 34 L0 34 Z',
  S: 'M26 6 C22 1 14 -1 8 2 C1 5 0 13 6 17 L18 21 C22 23 21 28 17 29 C12 30 6 28 3 24 L0 29 C5 34 15 36 21 33 C28 30 29 21 22 17 L11 13 C7 11 8 7 12 6 C16 5 20 6 23 10 Z',
  A: 'M14 0 L21 0 L31 34 L24 34 L22 26 L13 26 L11 34 L4 34 Z M15 20 L21 20 L18 8 Z',
  L: 'M0 0 L7 0 L7 28 L24 28 L24 34 L0 34 Z',
  W: 'M0 0 L7 0 L11 24 L16 4 L22 4 L27 24 L31 0 L38 0 L31 34 L24 34 L19 14 L14 34 L7 34 Z',
};
/*
  advance = the glyph's real ink width; bearing = how far its path starts to
  the right of its own origin. The A path begins at x=4, so without pulling it
  back by that amount the wordmark renders as "VIS AL AW".
*/
const metrics = {
  V: { advance: 28, bearing: 0 },
  I: { advance: 7,  bearing: 0 },
  S: { advance: 29, bearing: 0 },
  A: { advance: 27, bearing: 4 },
  L: { advance: 24, bearing: 0 },
  W: { advance: 38, bearing: 0 },
};
const TRACKING = 8;

let x = 0;
const wordmark = 'VISALAW'.split('').map(ch => {
  const { advance, bearing } = metrics[ch];
  const g = `<g transform="translate(${x - bearing} 0)"><path d="${letters[ch]}" fill="#FFFFFF"/></g>`;
  x += advance + TRACKING;
  return g;
}).join('');

const overlay = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"    stop-color="#0C1530" stop-opacity="0.94"/>
      <stop offset="0.55" stop-color="#0C1530" stop-opacity="0.80"/>
      <stop offset="1"    stop-color="#0C1530" stop-opacity="0.42"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#s)"/>

  <g transform="translate(84 96) scale(1.5)">
    <g transform="skewX(-9)" fill="#5C77D6">
      <circle cx="9" cy="6" r="5"/>
      <path d="M5 15h8v34H5z"/>
    </g>
    <g transform="translate(26 15)">${wordmark}</g>
  </g>

  <text x="84" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="62" fill="#FFFFFF">
    We tell you where you stand
  </text>
  <text x="84" y="404" font-family="Georgia, 'Times New Roman', serif" font-size="62" fill="#FFFFFF">
    before you pay us to find out.
  </text>

  <rect x="84" y="452" width="120" height="2" fill="#5C77D6"/>
  <text x="84" y="510" font-family="Helvetica, Arial, sans-serif" font-size="27" fill="#AEB9D8">
    Licensed immigration advisers · Central Auckland
  </text>
</svg>`);

await sharp('src/assets/hero-auckland.jpg')
  .resize(W, H, { fit: 'cover', position: 'attention' })
  .composite([{ input: overlay }])
  .jpeg({ quality: 88 })
  .toFile('public/og-default.jpg');

const { size } = await sharp('public/og-default.jpg').metadata();
console.log(`public/og-default.jpg  ${W}x${H}  ${Math.round((size || 0) / 1024)}KB`);
