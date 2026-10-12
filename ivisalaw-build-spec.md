# iVISALAW NZ — Build Spec

Short technical reference for the site build.

## 1. Overview

**Client:** NZ Visa and Immigration Advisers Ltd, trading as iVISALAW NZ
**Replacing:** the existing Wix site at ivisalaw.co.nz
**Stack:** Astro 7 + Tailwind 4, Sveltia CMS (planned), Cloudflare Pages (target)

Pinned versions as at 1 September 2026: `astro@7.2.10`, `vite@8.2.2`, `tailwindcss@4.3.3`,
`zod@4.5.4`, `lenis@1.3.26`, `typescript@6.0.3`. **Do not re-pin to Astro 5** — it has
unpatched security advisories and no backport. The site is pure SSG, so no Cloudflare
adapter is needed; Pages serves `dist/` directly.

---

## 2. Approach

- **Motion:** Lenis smooth scroll, Astro View Transitions (`<ClientRouter />`), scroll-linked
  guilloche, one pinned pathway section (the signature — don't add a second).
- **Imagery:** `MediaSlot.astro` reserves each image box at its final aspect ratio and renders
  nothing in production. Until art is supplied, slots fall back to generated guilloche plates
  (`scripts/make-plates.mjs`, inlined by `Plate.astro`). Imagery must never depict the firm's
  premises or people unless it is real.
- **Pointer-tracked edge-light** on card grids: one delegated `pointermove` per grid,
  rAF-throttled, writing only `--mx`/`--my`; gated behind `(hover:hover) and (pointer:fine)`.
- Real 404 page. Shared easing curve for all motion.

---

## 3. Page inventory

**Core:** `/` · `/about/` · `/assessment/` · `/contact/` · `/complaints/` · `/privacy/`
**Work visas:** `/work-visas/` · `aewv` · `post-study`
**Residence:** `/residence/` · `skilled-migrant` · `green-list` · `partnership`
**Family:** `/family/` · `partner` · `dependent-children`
**Employers:** `/employers/` · `accreditation` · `job-check` · `audits`
**Other:** `/study/` · `/appeals/` · `/updates/`
**Tools:** `/check/` — eligibility checker

Every visa page follows one content collection schema (`src/content.config.ts`): who it's for,
eligibility, process, timeline, cost, what goes wrong, FAQ, related pathways.

- **Process** renders as a swimlane keyed on `actor`; lanes derive from first appearance.
- **Timeline** renders as a duration bar chart from optional `minWeeks`/`maxWeeks` — deliberately
  not a Gantt, because stage start dates are not knowable.
- **Cost** splits by payer. The `costSummary` headline is **authored, never computed** —
  employer fees are alternatives, so summing the table would produce a wrong number.

---

## 4. Design tokens

```
Canvas (dark theme — token names kept from the light palette)
--paper        #0B1540   page ground, deep navy
--white        #101C4D   raised surface: alternating bands, cards, tables
--deep         #050B26   darkest bands: triage, pinned pathway, plates
--ink          #F3F6FF   primary TEXT
--ink-2        #C5CEEB   secondary text
--ink-3        #9BA9D2   meta text
--rule         #26356D   hairlines

Accents
--indigo       #93A8F4   links, rules, accents on the navy ground
--indigo-lite  #B9C7FF   focus rings, glows, active states
--indigo-deep  #14204F   text on white buttons
--btn          #F3F6FF   primary button fill
--royal        #2A43A6   solid blue fill that carries white text
--pounamu      #5FD6B3   status and eligibility signals only

Display  Newsreader, weight 350, tracking -0.03em
Body     Public Sans, 300–700
Ease     cubic-bezier(.19, 1, .22, 1)
```

---

## 5. Build order

1. ~~Scaffold, tokens, layouts, header/footer, View Transitions~~ done
2. ~~Homepage, Lenis~~ done
3. ~~Content schema + AEWV page as the template~~ done
4. ~~Navigation skeleton and section indexes~~ done
5. **In progress** — remaining visa and employer pages, plus the legal pages
6. Eligibility checker
7. Sveltia CMS wiring + editing guide
8. Sinhala / Tamil / Korean routes
9. Schema.org, sitemap, redirects from old Wix URLs (every old URL needs a 301)
10. Lighthouse, axe, real-device pass
11. Cloudflare Pages deploy

---

## 6. Open items before launch

Tracked with the client outside this repo. In code, client-supplied values live in `PENDING`
in `src/lib/site.ts`; policy figures carry `verified: false` until signed off.

- Staff roles and licence details confirmed by the client
- Policy figures and fees signed off against live INZ policy
- Consultation fee and office hours
- Photography
- Government links (IAA register, immigration.govt.nz citations) re-checked at launch

---

## 7. Notes

- `.nav a` outranks `.btn` on specificity — scope button overrides as `.nav a.btn`.
- Never reveal with `clip-path` clipped to zero: the IntersectionObserver never fires. Use an
  overflow mask with an inner span.
- For scroll math use `getBoundingClientRect().top + scrollY`, not `offsetTop`.
- **ClientRouter replaces `<html>`'s class attribute on every navigation.** Own the class and
  re-assert it on `astro:after-swap` (`assertRootClasses()` in `src/scripts/site.ts`). After a
  swap, hard-sync Lenis: `lenis.scrollTo(window.scrollY, { immediate: true })`.
- **`overflow:hidden` on an ancestor of `position:sticky` kills the sticky.** The guilloche
  carries its own clip layer as a sibling of the pinned stage.
- Measure horizontal overflow as `scrollWidth > clientWidth` on `documentElement`.
- Astro 7 deprecates `z` from `astro:content`: import from `zod`, and use `z.url()`.
- **Never hand-maintain internal link lists.** `lib/routes.ts` checks each destination against
  the content collections at build time; unbuilt pages render as inert "in preparation" text.
- **Quote any YAML scalar containing `": "`.** `npm run build` runs
  `scripts/check-frontmatter.sh` first to catch it.
- Define the guilloche once as a `<symbol>` and reference it with `<use>`; inlining it per
  instance defeats gzip.
- Rebasing for a subpath must cover CSS `url()` as well as HTML attributes
  (`scripts/rebase-for-pages.mjs`).
- Never mute text with `opacity` — it fails contrast. Use a measured colour such as `--ink-3`.
- Cross-faded panels need taking out of the tab order as well as hiding (`setPaneShown()`).
- Government links move; re-check them before launch.
