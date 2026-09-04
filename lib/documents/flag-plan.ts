import { flagFieldByKey, type FlagCategory } from "./flag-fields";
import { canonicalize, valuesAgree } from "./flag-compare";
import { fieldEligibleForKind, type DocumentKind } from "./document-kind";
import {
  isOwnIdentity,
  isOwnSecondaryValue,
  EMPTY_IDENTITY,
  type OwnIdentity,
} from "./own-identity";

/**
 * Turning what the model said into flags worth storing.
 *
 * Everything arriving here is model output, so nothing is taken on trust: the
 * field must be one of the allow-listed columns, the document's kind must
 * plausibly know that field, the value must survive canonicalisation for that
 * column's type, and it must actually differ from what's on file once cosmetic
 * differences are folded out. Whatever is left is a real disagreement.
 *
 * The kind check is the one that stops the damage. Without it an invoice's
 * bill-to block gets proposed as the project's address, and a subcontractor's
 * quote total as the project's contract value — both of which happened.
 */

/** One item as the model reports it. Every property is untrusted. */
export type RawFlag = {
  field?: unknown;
  value?: unknown;
  explanation?: unknown;
  confidence?: unknown;
};

/** The record a flag is raised against, and what it currently holds. */
export type FlagSubject = {
  table: "projects" | "contractor_payments";
  id: string;
  values: Record<string, unknown>;
};

export type PlannedFlag = {
  category: FlagCategory;
  target_table: "projects" | "contractor_payments";
  target_id: string;
  target_field: string;
  current_value: string | null;
  suggested_value: string;
  confidence: "high" | "medium" | "low";
  explanation: string | null;
};

const CONFIDENCES = new Set(["high", "medium", "low"]);
const MAX_EXPLANATION = 400;

export function planFlags(
  raw: unknown,
  subjects: FlagSubject[],
  kind: DocumentKind,
  identity: OwnIdentity = EMPTY_IDENTITY,
): PlannedFlag[] {
  if (!Array.isArray(raw)) return [];

  // Jones Custom Homes' own name and office address appear on most documents
  // as the bill-to party. Finding one is a strong signal that the model was
  // reading the bill-to block, which also discredits the city/state/ZIP it
  // reported from the same block — those are too common to reject alone (a
  // project can sit in the same town as the office) but not alongside this.
  const readingOurOwnDetails = (raw as RawFlag[]).some((item) => {
    if (!item || typeof item !== "object") return false;
    const field = flagFieldByKey(typeof item.field === "string" ? item.field.trim() : "");
    if (!field) return false;
    const value = canonicalize(field.type, item.value);
    return value !== null && isOwnIdentity(identity, field.column, value);
  });

  const subjectByTable = new Map(subjects.map((s) => [s.table, s]));
  const planned: PlannedFlag[] = [];
  const seen = new Set<string>();

  for (const item of raw as RawFlag[]) {
    if (!item || typeof item !== "object") continue;

    const key = typeof item.field === "string" ? item.field.trim() : "";
    const field = flagFieldByKey(key);
    // An unrecognised field name is the model inventing a column. Drop it.
    if (!field) continue;

    // The document has no standing to dispute this field. This is not a
    // confidence judgement — a "high confidence" reading of the wrong party's
    // address is still the wrong party's address.
    if (!fieldEligibleForKind(kind, field.key)) continue;

    const subject = subjectByTable.get(field.table);
    if (!subject) continue;

    const suggested = canonicalize(field.type, item.value);
    if (suggested === null) continue;

    // Never propose our own details as the project's, whatever the document
    // literally says. This is the backstop for the kinds that do legitimately
    // carry a site address — a permit, a contract, a set of plans — where our
    // address sits on the page next to the site's.
    if (isOwnIdentity(identity, field.column, suggested)) continue;
    if (readingOurOwnDetails && isOwnSecondaryValue(identity, field.column, suggested)) continue;

    const currentRaw = subject.values[field.column];
    const current =
      currentRaw === null || currentRaw === undefined ? null : String(currentRaw);

    if (valuesAgree(field.type, current, suggested)) continue;

    // One flag per field per document, even if the model lists it twice.
    const dedupeKey = `${field.table}:${subject.id}:${field.column}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const confidence =
      typeof item.confidence === "string" && CONFIDENCES.has(item.confidence)
        ? (item.confidence as "high" | "medium" | "low")
        : "medium";

    const explanation =
      typeof item.explanation === "string" && item.explanation.trim()
        ? item.explanation.trim().slice(0, MAX_EXPLANATION)
        : null;

    planned.push({
      category: field.category,
      target_table: field.table,
      target_id: subject.id,
      target_field: field.column,
      current_value: current,
      suggested_value: suggested,
      confidence,
      explanation,
    });
  }

  return planned;
}
