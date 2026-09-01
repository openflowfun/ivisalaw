/** Single source of truth for firm details used across header, footer and schema. */
export const SITE = {
  name: 'iVISALAW NZ',
  legalName: 'NZ Visa and Immigration Advisers Limited',
  url: 'https://www.ivisalaw.co.nz',
  phone: '+64 9 368 1689',
  phoneHref: 'tel:+6493681689',
  email: 'admin@ivisalaw.co.nz',
  address: {
    street: 'Level 5, Southern Cross Building',
    street2: '59–67 High Street',
    locality: 'Auckland',
    postcode: '1010',
    country: 'NZ',
  },
  iaaRegister: 'https://iaa.ewr.govt.nz/PublicRegister/',
} as const;

export const NAV = [
  { href: '/work-visas/', label: 'Work visas' },
  { href: '/residence/', label: 'Residence' },
  { href: '/family/', label: 'Family' },
  { href: '/employers/', label: 'Employers' },
  { href: '/about/', label: 'About' },
] as const;

/*
  Values the client still owes us before launch (build spec §6).

  Collected here rather than scattered through pages so there is one list to
  work through at handover — and so nothing gets invented to fill a gap. Each
  page renders an honest fallback while the value is null, and the dev-only
  notices point back here.

  The explicit annotation matters: without it TypeScript narrows each null
  literal to `never` and the "once supplied" branches stop type-checking.
*/
export interface PendingFromClient {
  /** Assessment fee. Shown on /assessment/ once set. */
  consultationFee: string | null;
  /** Office hours. The block on /contact/ stays hidden until set. */
  officeHours: { day: string; time: string }[] | null;
}

export const PENDING: PendingFromClient = {
  consultationFee: null,
  officeHours: null,
};
