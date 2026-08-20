/**
 * Shared expiration classification for insurance certificates.
 *
 * Pulled out of the inline logic in ContractorDetail so the company-insurance
 * page classifies policies the same way — a COI that reads "expired" on the
 * contractor page must not read "current" on Blake's page.
 */

export type ExpiryStatus = "expired" | "expiring" | "current" | "unknown";

/** A policy inside this many days of lapsing is flagged for renewal. */
export const EXPIRING_SOON_DAYS = 30;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * JLC operates out of Utah, so "is this policy expired?" is a question about
 * the Utah calendar day — not the viewer's, and not the server's.
 *
 * Pinning it also makes the answer deterministic across the SSR/hydration
 * boundary. Calling `new Date()` in render instead would let the server (UTC)
 * and the browser (UTC-6/-7) land on different calendar days for most of the
 * evening, so the "Nd left" badge would render one value on the server and a
 * different one on the client.
 */
export function businessToday(now: Date = new Date()): Date {
  // en-CA formats as YYYY-MM-DD, which is trivial to split.
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);

  // Built from local parts so the getFullYear/getMonth/getDate reads below
  // return these exact values whatever timezone the process runs in.
  return new Date(y, m - 1, d);
}

/**
 * Whole days from `today` until `expiration`, or null when undated.
 *
 * Both sides are normalized to UTC midnight before subtracting. Comparing raw
 * timestamps would let a policy expiring later today read as "-0 days" or flip
 * status purely on the clock time the page happened to render.
 */
export function daysUntilExpiration(
  expiration: string | null | undefined,
  today: Date = new Date(),
): number | null {
  if (!expiration) return null;

  // Stored as a bare `date` (YYYY-MM-DD). Parsing that with `new Date()` in a
  // negative-offset timezone (Utah is UTC-6/-7) yields the *previous* day
  // locally, so a policy would show as expiring a day early. Split instead.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(expiration);
  if (!match) return null;

  const expUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return Math.round((expUtc - todayUtc) / MS_PER_DAY);
}

/**
 * Classify a policy by its expiration date. A policy expiring *today* still
 * counts as current — coverage runs through the end of the stated day.
 */
export function expiryStatus(
  expiration: string | null | undefined,
  today: Date = new Date(),
): ExpiryStatus {
  const days = daysUntilExpiration(expiration, today);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "expiring";
  return "current";
}
