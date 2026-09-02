# iVISALAW NZ — Build Spec

Working document for the full site build. Open this first in Cowork.

**Client:** NZ Visa and Immigration Advisers Ltd, trading as iVISALAW NZ
**Location:** Level 5, Southern Cross Building, 59–67 High Street, Auckland 1010
**Replacing:** Wix site at ivisalaw.co.nz
**Stack:** Astro 7 + Tailwind 4, Sveltia CMS, Cloudflare Pages

Pinned versions as at 1 September 2026: `astro@7.2.10`, `vite@8.2.2`, `tailwindcss@4.3.3`,
`zod@4.5.4`, `lenis@1.3.26`, `typescript@6.0.3`. `npm audit` clean.

**Do not re-pin to Astro 5.** It carried eight unpatched advisories (XSS via `define:vars`,
spread attribute names, `transition:*` values and slot names; host-header SSRF; plus
`sharp`/libvips), and npm gave the only fix as a major upgrade — there is no Astro 5
backport. Its last patch was 26 May 2026.

The site is pure SSG, so no `@astrojs/cloudflare` adapter is needed; Pages serves `dist/`
directly. (The current adapter requires Astro 7 anyway.)

---

## 1. What the budget actually buys

Worth being straight about this before we scope. At this price the visual layer is table stakes — every agency delivers that. Four things justify the number, and three of them are invisible in a screenshot:

| Deliverable | Why it's defensible |
|---|---|
| **Eligibility checker** | 6–8 step branching tool that returns a real assessment. Highest-converting element in this vertical. No Auckland competitor has one. |
| **15 researched visa pages** | 1,200–1,800 words each against live INZ policy. This is what wins organic search, and it's the bulk of the hours. |
| **Multilingual: Sinhala, Tamil, Korean** | Their team already speaks these. Nobody is competing for those queries. Roughly triples addressable search. |
| **CMS + policy-update workflow** | INZ changed the rules four times in 18 months. If the client can't edit, the site is stale in a quarter and they blame us. |

Everything below assumes those four are the spine. Visual polish serves them; it doesn't replace them.

---

## 2. Modernisation pass — what changes from the current homepage

The v1 homepage is deliberately restrained. These are the upgrades that take it to the top of the bracket without tipping into showreel territory.

### Motion
- **Lenis smooth scroll** — single biggest perceived-quality lever. Momentum scrolling is what separates expensive sites from competent ones.
- **Astro View Transitions** — cross-page morphing so the site feels like an app, not a stack of documents. This is the current "modern" tell for multi-page sites and Astro does it natively. `<ClientRouter />` from `astro:transitions`.
- **Scroll-linked guilloche** — tie rotation to scroll velocity instead of a fixed timer, so the texture responds to the reader.
- Keep the pinned pathway. It's the signature. Don't add a second pinned section.

### Art direction — the real gap
Currently zero photography, which was a deliberate rejection of the smiling-family stock cliché. That holds, but "no imagery" isn't the same as "art directed." Proposal:

- Commission or generate a **documentary-style Auckland set** — the High Street office, the harbour, real streetscapes. Cool-toned, overcast, unglamorous. No beaches, no jumping.
- **Duotone treatment** in brand indigo so every image is unmistakably theirs and inconsistent source material stops mattering.

**Built, pending art.** `MediaSlot.astro` reserves each image box at its final aspect
ratio and ships `<Picture>` (AVIF/WebP), lazy loading, optional LQIP blur-up and the
indigo duotone as a CSS blend layer. Slots render nothing in production and a labelled
outline in dev, so pages carry no grey holes while art direction is open. Visa pages
declare slots via `media.hero` / `media.band` in frontmatter. Dropping art in later
causes no layout shift and no rebuild.

**Interim: guilloche plates, not photographs.** Image generation was unavailable (Higgsfield
account at 0 credits, free plan), and stock is ruled out above — so the slots now render
engraved guilloche *plates* rather than sitting empty. `scripts/make-plates.mjs` generates
three epitrochoid variants (`band`, `panel`, `quiet`) into `src/assets/plates/`, inlined by
`Plate.astro` so the strokes inherit `currentColor` and the same file works indigo-on-paper or
white-on-ink. Sampling is fixed at 55 points per revolution — the threshold where the polyline
stops reading as faceted — which keeps each plate to 4–7KB gzipped.

This is a real answer rather than a placeholder: the guilloche is already the brand's device,
it carries the security-document association that suits a compliance-led firm, and it cannot be
mistaken for a photograph of a real place or person. Photography, when it arrives, drops into
the same slots at the same aspect ratios and the plates step aside.

**Do not generate anything that depicts the firm.** Atmospheric or architectural
imagery is fine. A generated image presented as their High Street office, or as their
people, is a fabricated depiction of a real business — that is a different thing from
art direction, and it is the client's call, not ours. Team headshots stay a client
action.
- **Team headshots reshot** on one grey seamless. Currently a cropped Facebook photo sits next to a cropped passport photo. On a trust-based service this is the single cheapest credibility fix available.

### Layout
- Break the grid on two or three sections — asymmetric splits, an image bleeding past the container edge. Currently every section is the same centred column.
- Widen the type scale. Push display larger, body smaller. More contrast reads as more confident.
- One horizontally-scrolling section for the Green List occupations — content genuinely wider than the viewport, so the device is earned.

### Detail
- Custom focus rings and selection colour in brand indigo.
- **Pointer-tracked edge-light on card grids.** A radial gradient masked to a 1px border
  ring, driven by one delegated `pointermove` per grid (never one per card), rAF-throttled,
  writing only `--mx`/`--my` so the work stays on the compositor. Gated behind
  `(hover:hover) and (pointer:fine)`; touch gets a tap pulse instead of a stranded
  highlight. Keep it subtle — on a firm of licensed advisers a soft edge reads as craft,
  a neon bloom spends the trust the rest of the design is buying.
- Number and figure animations on a shared easing curve so the whole site feels like one hand made it.
- Real 404 and thank-you pages. Nobody budgets for these and everybody notices them.

---

## 3. Page inventory

**Core (6)**
`/` · `/about/` · `/assessment/` · `/contact/` · `/complaints/` · `/privacy/`

**Visas (9)**
`/work-visas/` · `/work-visas/aewv/` · `/work-visas/post-study/`
`/residence/` · `/residence/skilled-migrant/` · `/residence/green-list/` · `/residence/partnership/`
`/family/partner/` · `/family/dependent-children/`

**Employers (4)**
`/employers/` · `/employers/accreditation/` · `/employers/job-check/` · `/employers/audits/`

**Other (3)**
`/study/` · `/appeals/` · `/updates/` (policy changes — the SEO engine)

**Tools (1)**
`/check/` — eligibility checker

Roughly 23 pages. Every visa page follows one content collection schema: who it's for, eligibility, process, timeline, cost, what goes wrong, FAQ, related pathways.

Three of those sections are **not** prose lists, because four sequential list-and-table
sections in a row is what made the first draft feel flat:

- **Process** renders as a swimlane keyed on `actor` (You / Your employer / Immigration NZ).
  Lanes are derived from first appearance, so pages with a different actor mix still work.
  On AEWV it shows at a glance that four of six steps belong to the employer.
- **Timeline** renders as a bar chart from optional `minWeeks`/`maxWeeks`. Bars compare
  stage *durations* on a shared scale — deliberately not a Gantt, because the stages are
  sequential but their start dates are not knowable and drawing them as if they were would
  imply a precision we cannot support. Rows without numbers still render, just without a bar.
- **Cost** splits by who pays, above the itemised table. The `costSummary` headline is
  **authored, never computed**: employer fees are alternatives, not addends — a business pays
  standard *or* high-volume *or* triangular accreditation — so summing the table would
  produce a confidently wrong number.

---

## 4. Design tokens

```
--ink          #0C1530   deep navy, primary text and dark ground
--indigo       #3852B3   sampled from the existing logo — do not alter
--indigo-lite  #5C77D6   active states, rails
--indigo-deep  #22347A   hovers, deep fills
--paper        #F2F5FB   cool document stock
--pounamu      #1B6A57   status and eligibility signals only, never decoration
--rule         #D2DAEA   hairlines

Display  Newsreader, weight 350, tracking -0.03em
Body     Public Sans, 300–700
Ease     cubic-bezier(.19, 1, .22, 1)
```

Logo stays as supplied. Palette is built around it, not over it.

---

## 5. Build order

1. ~~Astro scaffold, tokens, layouts, header/footer, View Transitions~~ **done**
2. ~~Port the homepage, add Lenis~~ **done**
3. ~~Content collection schema + AEWV page as the template all others follow~~ **done**
4. ~~Navigation skeleton: 4 section indexes + `/assessment/`, `/about/`, `/contact/`~~ **done**
   — pulled forward out of step 5, because until it existed every item in the primary nav
   and every CTA on the site 404'd, and the client could not click through anything.
5. **In progress** — remaining visa and employer pages, plus `/complaints/`, `/privacy/`,
   `/terms/` (the three legal pages are linked from the footer sitewide and need client copy)
   - done: `/work-visas/aewv/`, `/residence/green-list/`, `/residence/skilled-migrant/`,
     `/employers/accreditation/`, `/employers/job-check/`
   - next: `/family/partner/`, `/family/dependent-children/`, `/residence/partnership/`,
     `/employers/audits/`, then post-study, study and appeals
6. Eligibility checker
7. Sveltia CMS wiring + client editing guide
8. Sinhala / Tamil / Korean routes
9. Schema.org (LegalService, FAQPage, BreadcrumbList), sitemap, redirects from every old Wix URL
10. Lighthouse, axe, real-device pass
11. Cloudflare Pages deploy

Redirects matter more than they look — every `/copy-of-workvisa` style URL needs a 301 or the existing rankings are lost on launch day.

---

## 6. Open items for the client

- [ ] IAA licence numbers for the five advisers still showing as placeholder
- [ ] Confirm who is a licensed adviser vs. case manager — currently guessed
- [ ] Sign-off on every policy figure and threshold before launch
- [ ] Is "iVISALAW" staying? A firm of licensed advisers trading under "law" is worth a compliance check
- [ ] Photography: commission a shoot, or generate and duotone?
- [ ] Consultation fee — the assessment page needs a real number
- [ ] Who maintains `/updates/` after launch, and how often

---

## 7. Notes carried forward

Bugs found and fixed in v1, worth not repeating:

- `.nav a` outranks `.btn` on specificity — scope button overrides as `.nav a.btn` or the CTA loses its colour and padding silently.
- Never reveal with `clip-path` clipped to zero. Chromium computes the IntersectionObserver rect *after* clipping, so a fully-clipped element never intersects and the observer never fires. Use an overflow mask with an inner span.
- `offsetTop` is relative to the nearest positioned ancestor. For scroll math use `getBoundingClientRect().top + scrollY`.
- Pinned sections must unpin below 1000px.

Found during the Astro 7 build (steps 1–3):

- **ClientRouter wipes runtime-added `<html>` classes on every navigation.** It replaces the
  class attribute with the incoming document's. Lenis only sets `.lenis` at construction and
  survives navigation as a module-scope singleton, so the class silently disappeared after the
  first swap and `html:not(.lenis){scroll-behavior:smooth}` put native smooth scroll back in
  competition with Lenis. Never key CSS off a library's own root class — own the class and
  re-assert it on `astro:after-swap` (which fires before `astro:page-load`). See
  `assertRootClasses()` in `src/scripts/site.ts`.
- **Lenis needs its scroll state hard-synced after a swap**, or it animates back toward the
  previous page's position: `lenis.scrollTo(window.scrollY, { immediate: true })`.
- **`overflow:hidden` on an ancestor of a `position:sticky` element kills the sticky.** The
  guilloche is far wider than the viewport, so it carries its own clip layer as a *sibling* of
  the pinned stage rather than relying on the parent to clip. Without it the homepage overflowed
  horizontally to 942px at a 390px viewport.
- **Measure horizontal overflow as `scrollWidth > clientWidth` on `documentElement`.** Comparing
  against `window.innerWidth` gives a false pass under device emulation.
- **Astro 7 deprecates the `z` re-export from `astro:content`** and it cannot be used as a type
  namespace (`z.infer` fails). Import `z` from `zod` directly, and pin `zod` explicitly rather
  than relying on Astro's transitive dependency. Zod 4 moved string formats to the top level:
  `z.url()`, not `z.string().url()`.
- **Never hand-maintain a list of internal links.** The footer, the homepage service grid,
  every "related pathways" block and every section index all point at pages that are planned
  but unwritten. `lib/routes.ts` checks each destination against the content collections at
  build time: a page that exists renders as a link, one that doesn't renders as inert text
  marked "in preparation". Nothing 404s, and links light up on their own the moment a content
  file lands. `comm -23` over the built HTML is the check — it should return nothing.
- **Quote any YAML scalar containing `": "`.** `description: What it requires in 2026: accreditation`
  parses as a nested mapping and fails the build. It has bitten twice; `npm run build` now runs
  `scripts/check-frontmatter.sh` first to catch it.
- **Client-supplied values live in `PENDING` in `lib/site.ts`,** never inline in a page. Each has
  an honest fallback (the assessment fee reads "confirmed when you book"; office hours stay
  hidden) plus a dev-only notice. TypeScript needs the explicit interface annotation, or it
  narrows each `null` to `never` and the "once supplied" branches stop compiling.
- The guilloche SVG is ~32KB. Define it once as a `<symbol>` and reference it with `<use>`;
  inlining it per instance defeats gzip, whose 32KB window cannot dedupe the copies. Cut the
  homepage from 47.7KB to 18.1KB gzipped.
