import { flagFieldByKey, type FlagCategory } from "./flag-fields";
import { canonicalize, valuesAgree } from "./flag-compare";

/**
 * Turning what the model said into flags worth storing.
 *
 * Everything arriving here is model output, so nothing is taken on trust: the
 * field must be one of the allow-listed columns, the value must survive
 * canonicalisation for that column's type, and it must actually differ from
 * what's on file once cosmetic differences are folded out. Whatever is left is
 * a real disagreement.
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

export function planFlags(raw: unknown, subjects: FlagSubject[]): PlannedFlag[] {
  if (!Array.isArray(raw)) return [];

  const subjectByTable = new Map(subjects.map((s) => [s.table, s]));
  const planned: PlannedFlag[] = [];
  const seen = new Set<string>();

  for (const item of raw as RawFlag[]) {
    if (!item || typeof item !== "object") continue;

    const key = typeof item.field === "string" ? item.field.trim() : "";
    const field = flagFieldByKey(key);
    // An unrecognised field name is the model inventing a column. Drop it.
    if (!field) continue;

    const subject = subjectByTable.get(field.table);
    if (!subject) continue;

    const suggested = canonicalize(field.type, item.value);
    if (suggested === null) continue;

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
