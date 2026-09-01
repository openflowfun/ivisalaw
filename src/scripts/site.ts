import Lenis from 'lenis';

/*
  All page behaviour lives here. Two lifecycles are in play:

  - Module scope runs ONCE per document. Lenis and the shared rAF loop
    live here so momentum survives a View Transitions navigation instead
    of being torn down and rebuilt on every click.
  - initPage()/teardownPage() run per navigation, wiring and unwiring the
    DOM that ClientRouter swaps underneath us.
*/

const prefersReduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────────────────────────
   Module-scope: Lenis + the shared animation loop
   ───────────────────────────────────────────────────────────── */
let lenis: Lenis | null = null;
let rafId = 0;

/** Decorative guilloche rotation, coupled to scroll velocity (spec §2). */
let spinAngle = 0;
let spinRate = 1;
let guilloEls: HTMLElement[] = [];
let guilloVisible = false;
let lastFrame = 0;

function frame(now: number) {
  const dt = lastFrame ? Math.min(now - lastFrame, 64) : 16;
  lastFrame = now;

  lenis?.raf(now);

  if (guilloVisible && guilloEls.length) {
    // Base rate matches the 260s CSS keyframe: 360deg / 260000ms.
    spinAngle = (spinAngle + (360 / 260000) * dt * spinRate) % 360;
    for (const el of guilloEls) el.style.rotate = `${spinAngle}deg`;
    // Ease the velocity multiplier back to rest.
    spinRate += (1 - spinRate) * 0.045;
  }

  rafId = requestAnimationFrame(frame);
}

function startEngine() {
  if (prefersReduced()) return;

  if (!lenis) {
    lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native touch scrolling on mobile — smoothing touch fights the
      // platform and makes the page feel laggy, not expensive.
      syncTouch: false,
    });
    lenis.on('scroll', (e: { velocity: number }) => {
      // Velocity is px/frame; cap so a flick can't spin the texture wildly.
      const v = Math.min(Math.abs(e.velocity) / 14, 5);
      if (v > spinRate) spinRate = v;
      onScroll();
    });
  }

  assertRootClasses();

  if (!rafId) {
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }
}

/*
  ClientRouter replaces <html>'s class attribute with the incoming
  document's, which is static HTML and therefore has neither of the
  classes the running JS depends on. Without this, `.lenis` vanishes on
  every navigation and `html:not(.lenis){scroll-behavior:smooth}` starts
  fighting Lenis for control of the scroll.

  Both classes are ours. Lenis's own `.lenis` class is left to Lenis — no
  rule of ours depends on it, precisely so this cannot regress again.
*/
function assertRootClasses() {
  if (prefersReduced()) return;
  const root = document.documentElement;
  // Tells CSS that JS owns the guilloche rotation, so the keyframe
  // animation stands down and the two don't fight over `rotate`.
  root.classList.add('js-guillo');
  // Tells CSS that Lenis owns scrolling, so native smooth stands down.
  if (lenis) root.classList.add('js-lenis');
}

/* ─────────────────────────────────────────────────────────────
   Per-page state
   ───────────────────────────────────────────────────────────── */
let inited = false;
let io: IntersectionObserver | null = null;
let guilloIo: IntersectionObserver | null = null;
let ticking = false;
let cleanups: Array<() => void> = [];

const on = <K extends keyof WindowEventMap>(
  target: Window | Document | Element,
  type: K | string,
  fn: EventListenerOrEventListenerObject,
  opts?: AddEventListenerOptions,
) => {
  target.addEventListener(type, fn, opts);
  cleanups.push(() => target.removeEventListener(type, fn, opts));
};

/* Scroll-driven chrome: progress bar, sticky header, pinned pathway. */
let prog: HTMLElement | null = null;
let mast: HTMLElement | null = null;
let track: HTMLElement | null = null;
let rail: HTMLElement | null = null;
let panes: HTMLElement[] = [];
let rails: HTMLElement[] = [];
let cur = 0;

function setStage(i: number) {
  if (i === cur) return;
  cur = i;
  panes.forEach((p, n) => p.classList.toggle('on', n === i));
  rails.forEach((r, n) => r.classList.toggle('on', n === i));
}

function onScroll() {
  const y = window.scrollY;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  if (prog) prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
  if (mast) mast.classList.toggle('stuck', y > 24);

  // Pinned pathway unpins below 1000px; the CSS media query and this
  // guard have to agree or the panes desync from the layout.
  if (track && rail && window.innerWidth > 1000 && !prefersReduced()) {
    const r = track.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    if (span > 0) {
      const p = Math.min(Math.max(-r.top / span, 0), 1);
      rail.style.setProperty('--fill', `${12 + p * 88}%`);
      setStage(Math.min(3, Math.floor(p * 3.999)));
    }
  }
  ticking = false;
}

function requestScroll() {
  if (!ticking) {
    requestAnimationFrame(onScroll);
    ticking = true;
  }
}

/* Number count-up on the rules strip. */
function count(el: HTMLElement) {
  if (prefersReduced()) return;
  const target = parseFloat(el.dataset.count || '0');
  const dec = parseInt(el.dataset.dec || '0', 10);
  const pre = el.dataset.pre || '';
  const post = el.dataset.post || '';
  const dur = 1100;
  let t0: number | null = null;

  function step(ts: number) {
    if (t0 === null) t0 = ts;
    const p = Math.min((ts - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = pre + (target * e).toFixed(dec) + post;
    if (p < 1) requestAnimationFrame(step);
  }
  el.textContent = pre + (0).toFixed(dec) + post;
  requestAnimationFrame(step);
}

/*
  Edge-light: writes the pointer position onto whichever card is under the
  cursor, so CSS can aim a radial gradient at the border.

  One delegated listener per grid, not one per card, and the write is
  rAF-throttled — a listener on every card firing on every pointermove is
  how this effect ends up costing more than it's worth. We only ever set
  two custom properties, so the work stays on the compositor.
*/
let glowFrame = 0;

function wireEdgeLight() {
  // Touch devices never get a hover position; the tap pulse covers them.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    wireTapPulse();
    return;
  }

  document.querySelectorAll<HTMLElement>('.glow-grid').forEach(grid => {
    let pending: { card: HTMLElement; x: number; y: number } | null = null;

    on(grid, 'pointermove', e => {
      const ev = e as PointerEvent;
      const card = (ev.target as HTMLElement).closest<HTMLElement>('.glow');
      if (!card) return;
      const r = card.getBoundingClientRect();
      pending = { card, x: ((ev.clientX - r.left) / r.width) * 100, y: ((ev.clientY - r.top) / r.height) * 100 };
      if (!glowFrame) {
        glowFrame = requestAnimationFrame(() => {
          glowFrame = 0;
          if (!pending) return;
          pending.card.style.setProperty('--mx', `${pending.x.toFixed(1)}%`);
          pending.card.style.setProperty('--my', `${pending.y.toFixed(1)}%`);
        });
      }
    }, { passive: true });
  });

  wireTapPulse();
}

/* Brief confirmation flare on click or tap. */
function wireTapPulse() {
  document.querySelectorAll<HTMLElement>('.glow').forEach(card => {
    on(card, 'pointerdown', e => {
      const ev = e as PointerEvent;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${(((ev.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(((ev.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      card.classList.add('pulse');
      window.setTimeout(() => card.classList.remove('pulse'), 420);
    }, { passive: true });
  });
}

/* ─────────────────────────────────────────────────────────────
   Per-page wiring
   ───────────────────────────────────────────────────────────── */
function initPage() {
  if (inited) return;
  inited = true;

  const reduce = prefersReduced();

  /* mobile nav */
  const menuBtn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');
  if (menuBtn && nav) {
    on(menuBtn, 'click', () => {
      menuBtn.setAttribute('aria-expanded', String(nav.classList.toggle('open')));
    });
  }

  /* triage accordion */
  const opts = Array.from(document.querySelectorAll<HTMLButtonElement>('.opt'));
  opts.forEach(btn => {
    on(btn, 'click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      opts.forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        const id = b.getAttribute('aria-controls');
        if (id) document.getElementById(id)?.classList.remove('open');
      });
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        const id = btn.getAttribute('aria-controls');
        if (id) document.getElementById(id)?.classList.add('open');
      }
    });
  });

  /* hero load sequence */
  const h1 = document.getElementById('h1');
  if (h1) requestAnimationFrame(() => setTimeout(() => h1.classList.add('in'), 90));

  /* wrap headings for the mask reveal (idempotent across navigations) */
  document.querySelectorAll<HTMLElement>('.wipe').forEach(el => {
    if (el.firstElementChild?.classList.contains('wl')) return;
    const s = document.createElement('span');
    s.className = 'wl';
    while (el.firstChild) s.appendChild(el.firstChild);
    el.appendChild(s);
  });

  /* reveal on enter */
  io = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const t = e.target as HTMLElement;
        t.classList.add('in');
        if (t.hasAttribute('data-count')) count(t);
        io?.unobserve(t);
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
  );
  document
    .querySelectorAll('.rv,.wipe,.drawline,[data-count]')
    .forEach(el => io?.observe(el));

  /* scroll chrome */
  prog = document.getElementById('prog');
  mast = document.getElementById('mast');
  track = document.getElementById('pinTrack');
  rail = document.getElementById('rail');
  panes = Array.from(document.querySelectorAll<HTMLElement>('.pane'));
  rails = Array.from(document.querySelectorAll<HTMLElement>('.rail-item'));
  cur = 0;

  on(window, 'scroll', requestScroll, { passive: true });
  on(window, 'resize', requestScroll, { passive: true });
  onScroll();

  /* rail is clickable too */
  rails.forEach(r => {
    on(r, 'click', () => {
      const i = Number(r.dataset.i || 0);
      if (window.innerWidth > 1000 && track && !reduce) {
        // offsetTop is relative to the nearest positioned ancestor;
        // rect.top + scrollY is the only reliable document offset.
        const rect = track.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const span = rect.height - window.innerHeight;
        const dest = top + span * (i / 3.999) + 4;
        if (lenis) lenis.scrollTo(dest);
        else window.scrollTo({ top: dest, behavior: 'smooth' });
      } else {
        setStage(i);
      }
    });
  });

  /* edge-light on card grids */
  wireEdgeLight();

  /* guilloche: only animate while one is actually on screen */
  guilloEls = Array.from(document.querySelectorAll<HTMLElement>('.guillo'));
  if (guilloEls.length && !reduce) {
    let seen = 0;
    guilloIo = new IntersectionObserver(entries => {
      entries.forEach(e => (seen += e.isIntersecting ? 1 : -1));
      guilloVisible = seen > 0;
    });
    guilloEls.forEach(el => guilloIo?.observe(el));
  }

  startEngine();
  // The new document is a different height, and ClientRouter has already
  // set the scroll position. Re-measure, then hard-sync Lenis's internal
  // target to the real position or it will animate back to the old one.
  lenis?.resize();
  lenis?.scrollTo(window.scrollY, { immediate: true });
}

function teardownPage() {
  if (glowFrame) { cancelAnimationFrame(glowFrame); glowFrame = 0; }
  io?.disconnect();
  io = null;
  guilloIo?.disconnect();
  guilloIo = null;
  guilloEls = [];
  guilloVisible = false;
  cleanups.forEach(fn => fn());
  cleanups = [];
  panes = [];
  rails = [];
  prog = mast = track = rail = null;
  inited = false;
}

export function boot() {
  document.addEventListener('astro:page-load', initPage);
  document.addEventListener('astro:before-swap', teardownPage);
  // Runs immediately after the swap, ahead of astro:page-load, so the
  // scroll engine is never a frame out of contract with the CSS.
  document.addEventListener('astro:after-swap', assertRootClasses);
  // astro:page-load normally fires after this module executes, but if the
  // document is already parsed we may have missed it — initPage is guarded.
  if (document.readyState !== 'loading') initPage();
  else document.addEventListener('DOMContentLoaded', initPage, { once: true });
}
