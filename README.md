# iVISALAW NZ

Website for **NZ Visa and Immigration Advisers Limited**, trading as iVISALAW NZ —
IAA-licensed immigration advisers, Auckland. Replaces the existing Wix site.

Astro 7 · Tailwind 4 · Cloudflare Pages (target)

---

## Pre-launch

This build is **not the live site yet**. Every preview must be built with
`PUBLIC_PREVIEW=true` (see below), which emits `noindex, nofollow` and a
`Disallow: /` robots.txt. Client-supplied values (consultation fee, office hours)
are tracked in `PENDING` in `src/lib/site.ts`, and every policy figure on the visa
pages stays `verified: false` until it has been signed off.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # frontmatter check → astro check → astro build
npm run preview  # serves dist/
```

## Giving the client a preview link

Any preview **must** be built with `PUBLIC_PREVIEW=true` — `npm run build:preview`,
`npm run build:pages` and `npm run deploy:preview` all set it. That emits
`noindex, nofollow` on every page and a `Disallow: /` robots.txt, so the pre-launch
site cannot be indexed or mistaken for the live one.

**GitHub Pages** (current preview): `.github/workflows/pages.yml` builds with
`npm run build:pages` on every push to `main` and publishes to
`https://openflowfun.github.io/ivisalaw/`. Pages serves the repo under `/ivisalaw/`, so
`scripts/rebase-for-pages.mjs` rewrites internal links, assets and CSS `url()`s to that
subpath after the build (the source and the production build are untouched), and writes
`.nojekyll` so `/_astro/` is not stripped. Requires Pages enabled with source
"GitHub Actions", and a public repo unless the account is on a paid plan.

**Cloudflare Pages** (production target — serves at the root, so no rebasing):

```bash
npm run deploy:preview
```

First run opens a browser to sign in to Cloudflare; after that you get a permanent
`https://ivisalaw-preview.pages.dev`. To redeploy on every push instead, connect the repo
in the Cloudflare dashboard with build command `npm run build:preview` and output
directory `dist`.

**Live walkthrough, no account:** `npm run preview` then
`npx cloudflared tunnel --url http://localhost:4330` gives a temporary public URL for as
long as your machine stays on.

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
  rebase-for-pages.mjs   rewrites the built site for the GitHub Pages subpath
  check-frontmatter.sh   catches the YAML colon trap before the build does
```

## Things that will bite you

Collected in §7 of the build spec. The short version:

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

Scaffold, homepage, content schema and navigation are done; visa and employer pages are
in progress. Build order, page inventory and design tokens: `ivisalaw-build-spec.md`.
