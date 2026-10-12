/*
  The motion layer: everything here is decoration over content that is already
  complete without it. Each wire-up returns nothing and registers its own
  cleanup through `on`, so ClientRouter navigations never leak listeners.

  Rules this file keeps:
  - Nothing runs under prefers-reduced-motion. Content is shown as written.
  - Pointer effects only run on fine pointers; touch gets none of them.
  - Scroll work is driven from the one rAF-throttled scroll handler in site.ts
    (see tickMotion), never from its own scroll listener.
  - Nothing here changes a word a reader sees: policy figures are never
    animated, and scroll-lit text is lit by opacity only.
*/

type On = (
  target: Window | Document | Element,
  type: string,
  fn: EventListenerOrEventListenerObject,
  opts?: AddEventListenerOptions,
) => void;

const finePointer = () => window.matchMedia('(hover:hover) and (pointer:fine)').matches;
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

let words: { host: HTMLElement; spans: HTMLElement[] }[] = [];
let parallaxEls: HTMLElement[] = [];

/*
  Every block that sits below the fold in every section fades up as it
  arrives, whether or not the page author remembered to mark it. Elements
  already visible at load are left alone so nothing flashes.
*/
export function autoReveal() {
  const vh = window.innerHeight;
  const blocks = document.querySelectorAll<HTMLElement>(
    'main section .wrap > *:not(.rv):not(.wipe):not(.drawline), main .wrap > .sec-head > *:not(.rv):not(.wipe)',
  );
  blocks.forEach(el => {
    if (el.closest('.hero, .pin-outer, [data-no-reveal]')) return;
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.92) return;
    el.classList.add('rv');
    const sib = Array.from(el.parentElement?.children ?? []).indexOf(el);
    if (sib > 0 && sib < 7 && !el.hasAttribute('data-d')) el.setAttribute('data-d', String(sib));
  });
}

/* Scroll-lit text: words go from dim to full as the paragraph crosses the view. */
export function wireScrollWords() {
  words = [];
  document.querySelectorAll<HTMLElement>('[data-scrub]').forEach(host => {
    if (host.querySelector('.sw')) return;
    const text = host.textContent ?? '';
    host.setAttribute('aria-label', text.trim());
    host.textContent = '';
    const spans = text.trim().split(/\s+/).map(w => {
      const s = document.createElement('span');
      s.className = 'sw';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = w + ' ';
      host.appendChild(s);
      return s;
    });
    words.push({ host, spans });
  });
}

export function wireParallax() {
  parallaxEls = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
}

/* Called from the shared scroll handler. */
export function tickMotion(y: number) {
  const vh = window.innerHeight;
  for (const { host, spans } of words) {
    const r = host.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    // 0 when the paragraph's top enters at 90% of the viewport, 1 when its
    // bottom has reached 55%.
    const p = clamp((vh * 0.9 - r.top) / (vh * 0.9 - vh * 0.55 + r.height));
    const lit = Math.round(p * spans.length);
    spans.forEach((s, i) => s.classList.toggle('lit', i < lit));
  }
  for (const el of parallaxEls) {
    if (y > window.innerHeight * 1.3) continue;
    el.style.transform = `translate3d(0,${(y * 0.14).toFixed(1)}px,0) scale(1.08)`;
  }
}

/* Buttons lean toward the pointer a few pixels. */
export function wireMagnetic(on: On) {
  if (!finePointer()) return;
  document.querySelectorAll<HTMLElement>('.btn, .mag').forEach(el => {
    on(el, 'pointermove', e => {
      const ev = e as PointerEvent;
      const r = el.getBoundingClientRect();
      const dx = (ev.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
      el.style.setProperty('--tx', `${(dx * 10).toFixed(1)}px`);
      el.style.setProperty('--ty', `${(dy * 8).toFixed(1)}px`);
    });
    on(el, 'pointerleave', () => {
      el.style.removeProperty('--tx');
      el.style.removeProperty('--ty');
    });
  });
}

/* A soft light that follows the cursor across the whole page. */
let spotFrame = 0;
export function wireSpotlight(on: On) {
  const spot = document.getElementById('spot');
  if (!spot || !finePointer()) return;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 3;
  const paint = () => {
    spotFrame = 0;
    spot.style.setProperty('--sx', `${x}px`);
    spot.style.setProperty('--sy', `${y}px`);
  };
  on(window, 'pointermove', e => {
    const ev = e as PointerEvent;
    x = ev.clientX;
    y = ev.clientY;
    spot.classList.add('on');
    if (!spotFrame) spotFrame = requestAnimationFrame(paint);
  }, { passive: true });
  on(document.documentElement, 'pointerleave', () => spot.classList.remove('on'));
}

export function teardownMotion() {
  if (spotFrame) { cancelAnimationFrame(spotFrame); spotFrame = 0; }
  words = [];
  parallaxEls = [];
}
