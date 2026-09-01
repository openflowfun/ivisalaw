/*
  Generates guilloche "plates" — the same engraved-rosette family as the
  hero texture, but composed as standalone artwork for section bands.

  Why this instead of photography: the guilloche is already the brand's
  visual device, it carries the security-document association that suits a
  compliance-led firm, it costs nothing, it scales to any size, and it
  cannot be mistaken for a factual photograph of premises or people.

  Each plate is a superimposed epitrochoid family. Point counts are kept
  deliberately low relative to the hero texture so a full-bleed band does
  not cost 32KB.
*/
import { writeFileSync, mkdirSync } from 'node:fs';

const TAU = Math.PI * 2;

/** One epitrochoid ring, sampled to an SVG polyline path. */
function ring({ R, r, d, turns, cx = 300, cy = 300 }) {
  const steps = Math.round(turns * SAMPLES_PER_TURN);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TAU * turns;
    const k = (R + r) / r;
    const x = (R + r) * Math.cos(t) - d * Math.cos(k * t);
    const y = (R + r) * Math.sin(t) - d * Math.sin(k * t);
    pts.push(`${(cx + x).toFixed(1)},${(cy + y).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

/*
  Point budget: these render at 5-15% opacity behind text, so smoothness
  matters far more than resolution. ~55 samples per revolution is the point
  at which the polyline stops reading as faceted; beyond that we are just
  paying bytes. steps is derived from turns rather than set by hand so the
  two can never drift apart.
*/
const SAMPLES_PER_TURN = 55;

const plates = {
  // Wide, open lattice — for full-bleed section bands.
  band: [
    { R: 118, r: 17, d: 96, turns: 9, w: 0.55, o: 0.55 },
    { R: 142, r: 23, d: 58, turns: 13, w: 0.4, o: 0.26 },
  ],
  // Tighter rosette — for masthead panels.
  panel: [
    { R: 104, r: 11, d: 104, turns: 11, w: 0.6, o: 0.55 },
    { R: 130, r: 19, d: 70, turns: 7, w: 0.45, o: 0.3 },
  ],
  // Sparse and calm — for pages that must not compete with dense content.
  quiet: [
    { R: 132, r: 29, d: 112, turns: 8, w: 0.5, o: 0.42 },
    { R: 88, r: 7, d: 60, turns: 5, w: 0.4, o: 0.24 },
  ],
};

mkdirSync('src/assets/plates', { recursive: true });

for (const [name, rings] of Object.entries(plates)) {
  const paths = rings
    .map(c => `<path d="${ring(c)}" fill="none" stroke="currentColor" stroke-width="${c.w}" opacity="${c.o}"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" aria-hidden="true" focusable="false">${paths}</svg>`;
  const file = `src/assets/plates/${name}.svg`;
  writeFileSync(file, svg);
  console.log(`${file}  ${(svg.length / 1024).toFixed(1)}KB  ${rings.length} rings`);
}
