import type { FlagValueType } from "./flag-fields";

/**
 * Deciding whether a value read off a document actually disagrees with what's
 * on file.
 *
 * This is the difference between a useful review queue and one nobody opens.
 * A model reading "1234 S Main St." off an invoice against "1234 South Main
 * Street" in the database has found nothing; so has "$45,744.00" against
 * 45744. Every one of those raised as a flag trains Blake to hit Reject on all
 * of them. So the model's output is not trusted to be a real difference —
 * everything is normalised and compared here first, and only survivors become
 * flags.
 */

const STREET_WORDS: Record<string, string> = {
  street: "st", str: "st", st: "st",
  road: "rd", rd: "rd",
  avenue: "ave", ave: "ave", av: "ave",
  drive: "dr", dr: "dr",
  lane: "ln", ln: "ln",
  boulevard: "blvd", blvd: "blvd",
  court: "ct", ct: "ct",
  circle: "cir", cir: "cir",
  place: "pl", pl: "pl",
  terrace: "ter", ter: "ter",
  parkway: "pkwy", pkwy: "pkwy",
  highway: "hwy", hwy: "hwy",
  north: "n", n: "n",
  south: "s", s: "s",
  east: "e", e: "e",
  west: "w", w: "w",
  northeast: "ne", ne: "ne",
  northwest: "nw", nw: "nw",
  southeast: "se", se: "se",
  southwest: "sw", sw: "sw",
  suite: "ste", ste: "ste",
  apartment: "apt", apt: "apt",
  unit: "unit",
};

/** Collapse the cosmetic differences out of a piece of text. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Address comparison, which needs more than case folding: "St." / "Street" and
 * "S" / "South" are the same address written by two different people.
 */
export function normalizeAddress(value: string): string {
  return normalizeText(value)
    .split(" ")
    .map((word) => STREET_WORDS[word] ?? word)
    .join(" ");
}

/** Money and other numerics, tolerant of "$1,250.50", "7.5%", "(1,200)". */
export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[$,%\s]/g, "");
  if (!cleaned) return null;
  // Accounting negatives: (1200) means -1200.
  const negated = /^\(.*\)$/.test(cleaned);
  const bare = negated ? cleaned.slice(1, -1) : cleaned;
  if (!/^-?\d*\.?\d+$/.test(bare)) return null;
  const n = Number(bare);
  if (!Number.isFinite(n)) return null;
  return negated ? -n : n;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Any of the handful of formats a construction document actually uses. */
export function parseDate(value: string): string | null {
  const text = value.trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return pad(iso[1], iso[2], iso[3]);

  const slashed = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (slashed) {
    const year = slashed[3].length === 2 ? `20${slashed[3]}` : slashed[3];
    return pad(year, slashed[1], slashed[2]);
  }

  const written = text.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (written) {
    const monthIndex = MONTHS.findIndex((m) => m.startsWith(written[1].toLowerCase()));
    if (monthIndex >= 0) return pad(written[3], String(monthIndex + 1), written[2]);
  }

  return null;
}

function pad(year: string, month: string, day: string): string | null {
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * The canonical form stored on the flag and written on accept. Returns null
 * when the model handed back something unusable for the field's type, which
 * drops the flag rather than storing garbage.
 */
export function canonicalize(type: FlagValueType, raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "n/a") return null;

  if (type === "number") {
    const n = parseNumber(text);
    return n === null ? null : String(n);
  }
  if (type === "date") {
    return parseDate(text);
  }
  return text;
}

/**
 * True when the two values are the same fact written differently, so no flag
 * is warranted. An absent current value counts as a disagreement worth
 * surfacing: a blank field the document can fill in is exactly the kind of
 * thing Blake wants to see.
 */
export function valuesAgree(
  type: FlagValueType,
  current: string | null | undefined,
  suggested: string,
): boolean {
  if (current === null || current === undefined || String(current).trim() === "") {
    return false;
  }
  const a = String(current).trim();

  if (type === "number") {
    const left = parseNumber(a);
    const right = parseNumber(suggested);
    if (left === null || right === null) return normalizeText(a) === normalizeText(suggested);
    // Half a cent: enough to absorb float noise, not enough to hide a rounding
    // difference anyone cares about.
    return Math.abs(left - right) < 0.005;
  }

  if (type === "date") {
    const left = parseDate(a);
    const right = parseDate(suggested);
    if (left && right) return left === right;
    return normalizeText(a) === normalizeText(suggested);
  }

  // Addresses get abbreviation folding; other text just gets case and
  // punctuation folding.
  if (looksLikeStreetAddress(a) || looksLikeStreetAddress(suggested)) {
    return normalizeAddress(a) === normalizeAddress(suggested);
  }
  return normalizeText(a) === normalizeText(suggested);
}

function looksLikeStreetAddress(value: string): boolean {
  return /^\s*\d+\s+\S/.test(value);
}
