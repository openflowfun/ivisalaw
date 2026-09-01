# iVISALAW NZ

Website for **NZ Visa and Immigration Advisers Limited**, trading as iVISALAW NZ —
IAA-licensed immigration advisers, Auckland. Replaces the existing Wix site.

Astro 7 · Tailwind 4 · Cloudflare Pages (target)

---

## ⚠️ Pre-launch — not client-approved

This build is **not ready to be published as the live site**:

- **IAA licence numbers are placeholders.** Five of six advisers show `IAA —`.
- **No policy figure has been signed off.** Every threshold, fee and duration on
  every visa page is marked `verified: false` and needs client confirmation
  against live INZ policy before launch. See the figure register at the foot of
  each visa page.
- **Who is a licensed adviser vs. case manager is currently guessed.**
- Consultation fee and office hours are unset — see `PENDING` in `src/lib/site.ts`.

Any preview deploy **must** be built with `PUBLIC_PREVIEW=true`, which emits
`noindex, nofollow` and a `Disallow: /` robots.txt. A pre-launch site carrying
unverified immigration advice must not be indexed or mistaken for the real one.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # frontmatter check → astro check → astro build
npm run preview  # serves dist/
```

## Layout

```
src/
  content/
    visas/       one .md per visa page, all sharing one schema
    sections/    section index pages (/work-visas/, /residence/, …)
  content.config.ts   the schema every visa page follows
  layouts/     Base · VisaPage · SectionPage
  components/  Header · Footer · Guilloche · Plate · MediaSlot · home/* · visa/*
  scripts/site.ts     all page behaviour (Lenis, reveals, pinned pathway, edge-light)
  lib/         site.ts (firm details + PENDING) · routes.ts (build-time link checking)
scripts/
  make-plates.mjs        generates the guilloche section artwork
  check-frontmatter.sh   catches the YAML colon trap before the build does
```

## Things that will bite you

Collected in full in §7 of the build spec. The short version:

- **Never hand-maintain internal link lists.** `lib/routes.ts` checks every
  destination against the content collections at build time; unbuilt pages
  render as inert "in preparation" cards rather than 404s, and light up on
  their own when written.
- **Quote any YAML scalar containing `": "`** — `description: rules in 2026: x`
  parses as a nested mapping and fails the build. `npm run build` checks first.
- **ClientRouter replaces `<html>`'s class attribute on every navigation.** Never
  key CSS off a library's root class; own the class and re-assert it on
  `astro:after-swap`.
- **`overflow:hidden` on an ancestor of `position:sticky` kills the sticky.** The
  guilloche carries its own clip layer as a *sibling* of the pinned stage.
- **`z` from `astro:content` is deprecated in Astro 7** and unusable as a type
  namespace. Import from `zod`; use `z.url()`, not `z.string().url()`.

## Status

Build order steps 1–4 complete: scaffold, homepage, content schema + AEWV
template, navigation skeleton. Next is the remaining 14 visa and employer pages.

Full spec, page inventory, design tokens and open client items: `ivisalaw-build-spec.md`.
