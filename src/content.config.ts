import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

/*
  One schema, every visa page. The section order below is the order the
  template renders and the order every page must follow:
  who it's for → eligibility → process → timeline → cost → what goes
  wrong → FAQ → related pathways.

  POLICY FIGURES
  Immigration settings move constantly, so no number is hard-coded into
  prose. Every threshold, fee and duration is a `figure` object carrying
  its own effective date, source URL and sign-off state. `verified`
  defaults to false: a figure is unverified until the client signs it off
  (build spec §6). The template renders an "Where these figures come
  from" register on every page and warns in dev while any remain false.
*/

const figure = z.object({
  /** Rendered value, e.g. "$35.00 an hour" or "5 years". */
  value: z.string(),
  /** What the figure governs. */
  label: z.string(),
  /** When this value took effect, e.g. "9 March 2026". */
  effective: z.string().optional(),
  /** Primary source, normally an immigration.govt.nz page. */
  source: z.url().optional(),
  /** Anything the client should weigh when signing this off. */
  note: z.string().optional(),
  /** Client sign-off. Stays false until confirmed against live policy. */
  verified: z.boolean().default(false),
});

export type Figure = z.infer<typeof figure>;

/*
  An image slot. Art direction is still open (build spec §6), so every
  slot is optional and pages ship without images today — the point is that
  the layout already reserves the exact box, so dropping art in later
  causes no shift and no rebuild.

  `src` is a path under src/assets/ so Astro can process it. `ratio` is
  what reserves the space, and is required whenever a slot is filled.
*/
const media = z.object({
  src: z.string(),
  alt: z.string(),
  /** Aspect ratio as w/h, e.g. 3/2. Reserves the box before load. */
  ratio: z.number().positive().default(1.5),
  /** Tint into brand indigo. Off for anything documentary or of people. */
  duotone: z.boolean().default(false),
  /** Tiny base64 data URI shown blurred until the real image decodes. */
  lqip: z.string().optional(),
  credit: z.string().optional(),
});

export type Media = z.infer<typeof media>;

const visas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/visas' }),
  schema: z.object({
    /* ── identity ─────────────────────────────────────────── */
    title: z.string(),
    /** Short label for nav, breadcrumbs and related-pathway cards. */
    navLabel: z.string(),
    /** Route section this page lives under, e.g. "work-visas". */
    section: z.enum(['work-visas', 'residence', 'family', 'employers', 'study', 'appeals']),
    /** <title> and meta description. */
    seoTitle: z.string(),
    description: z.string(),
    /** Standfirst under the h1. */
    intro: z.string(),

    /* ── currency ─────────────────────────────────────────── */
    updated: z.coerce.date(),
    /** Human-readable date the policy figures were last checked. */
    policyChecked: z.string(),

    /* ── the eight sections ───────────────────────────────── */
    whoItsFor: z.object({
      lead: z.string(),
      fits: z.array(z.string()).min(1),
      doesntFit: z.array(z.string()).min(1),
    }),

    keyFigures: z.array(figure).min(1),

    eligibility: z.array(z.object({
      title: z.string(),
      detail: z.string(),
      figure: figure.optional(),
    })).min(1),

    process: z.array(z.object({
      actor: z.enum(['You', 'Your employer', 'Immigration NZ']),
      title: z.string(),
      detail: z.string(),
      duration: z.string().optional(),
    })).min(1),

    timeline: z.array(z.object({
      stage: z.string(),
      /** Human label, e.g. "Allow 2–4 weeks". Always shown. */
      duration: z.string(),
      note: z.string().optional(),
      /* Numeric span drives the bar chart. Omit both and the row still
         renders, just without a bar — so other visa pages can adopt this
         gradually. */
      minWeeks: z.number().nonnegative().optional(),
      maxWeeks: z.number().nonnegative().optional(),
      /** Marks a summary row (e.g. "Total") so it renders apart. */
      isTotal: z.boolean().default(false),
    })).min(1),

    /*
      Authored, not computed. Employer fees are mutually exclusive — a
      business pays standard OR high-volume OR triangular accreditation —
      so summing the table would produce a confidently wrong number.
    */
    costSummary: z.array(z.object({
      payer: z.enum(['You', 'Your employer']),
      headline: z.string(),
      detail: z.string(),
    })).optional(),

    cost: z.array(z.object({
      item: z.string(),
      amount: z.string(),
      payer: z.enum(['You', 'Your employer', 'Either']),
      note: z.string().optional(),
      source: z.url().optional(),
      verified: z.boolean().default(false),
    })).min(1),

    whatGoesWrong: z.array(z.object({
      problem: z.string(),
      consequence: z.string(),
      fix: z.string(),
    })).min(1),

    faq: z.array(z.object({
      q: z.string(),
      a: z.string(),
    })).min(1),

    /** Optional image slots. See `media` above. */
    media: z.object({
      hero: media.optional(),
      band: media.optional(),
    }).optional(),

    related: z.array(z.object({
      title: z.string(),
      href: z.string(),
      note: z.string(),
    })).min(1),
  }),
});

/*
  Section index pages (/work-visas/, /residence/, …).

  Each declares the full set of pathways it covers, including ones not yet
  written. A pathway with a `slug` that matches a live entry in `visas`
  renders as a link; one that doesn't renders as an inert card marked "in
  preparation". That way the section index is complete and honest from day
  one and never emits a dead link — and pages light up automatically as
  they are written, with no index to remember to update.
*/
const sections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sections' }),
  schema: z.object({
    title: z.string(),
    navLabel: z.string(),
    section: z.enum(['work-visas', 'residence', 'family', 'employers', 'study', 'appeals']),
    seoTitle: z.string(),
    description: z.string(),
    intro: z.string(),
    /** Short orienting paragraph above the pathway grid. */
    lead: z.string(),
    pathways: z.array(z.object({
      title: z.string(),
      note: z.string(),
      /** Matches a `visas` entry id once that page exists. */
      slug: z.string().optional(),
      /** For destinations outside the visas collection. */
      href: z.string().optional(),
      tag: z.string().optional(),
    })).min(1),
    /** Optional masthead image. Falls back to a guilloche plate. */
    media: media.optional(),

    /** Optional orienting questions, rendered as a decision aid. */
    chooser: z.object({
      lead: z.string(),
      rows: z.array(z.object({ when: z.string(), then: z.string() })).min(1),
    }).optional(),
  }),
});

export const collections = { visas, sections };
