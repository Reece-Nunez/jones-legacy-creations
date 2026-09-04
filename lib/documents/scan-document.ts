import type { SupabaseClient } from "@supabase/supabase-js";
import { FLAG_FIELDS } from "./flag-fields";
import { planFlags, type FlagSubject } from "./flag-plan";
import type { FlagSubjectContext } from "./detect-flags";
import type { RawFlag } from "./flag-plan";

/**
 * The database half of a discrepancy scan: what to compare a document against,
 * and what to do with the result.
 *
 * Shared by the upload path (scan the one document just uploaded) and the
 * "Scan documents" button (catch up on a backlog), so both build the same
 * context and store flags the same way.
 */

/**
 * Assemble the fields this document can be checked against.
 *
 * The project is always in scope. A payment is only in scope when the document
 * is the invoice behind one — comparing an invoice total against an unrelated
 * payment would be noise, not a finding.
 */
export async function scanContextFor(
  supabase: SupabaseClient,
  projectId: string,
  fileUrl: string | null,
): Promise<{ context: FlagSubjectContext[]; subjects: FlagSubject[] }> {
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) return { context: [], subjects: [] };

  const subjects: FlagSubject[] = [
    { table: "projects", id: projectId, values: project },
  ];

  if (fileUrl) {
    const { data: payment } = await supabase
      .from("contractor_payments")
      .select("*")
      .eq("project_id", projectId)
      .eq("invoice_file_url", fileUrl)
      .limit(1)
      .maybeSingle();

    if (payment) {
      subjects.push({ table: "contractor_payments", id: payment.id, values: payment });
    }
  }

  const bySubject = new Map(subjects.map((s) => [s.table, s]));
  const context: FlagSubjectContext[] = [];

  for (const field of FLAG_FIELDS) {
    const subject = bySubject.get(field.table);
    if (!subject) continue;
    const raw = subject.values[field.column];
    context.push({
      field,
      current: raw === null || raw === undefined || raw === "" ? null : String(raw),
    });
  }

  return { context, subjects };
}

/**
 * Validate the model's output and write what survives.
 *
 * Re-scanning a document refreshes its open flags rather than stacking
 * duplicates, and never revives one Blake already accepted or rejected — the
 * unique index on (document, record, field) is what makes that safe, and
 * `ignoreDuplicates` is what makes a resolved flag stay resolved.
 *
 * @returns how many flags this scan newly raised (existing ones are left as
 *   they are, resolved or not).
 */
export async function storeFlags(
  supabase: SupabaseClient,
  projectId: string,
  documentId: string,
  raw: RawFlag[] | unknown,
  subjects: FlagSubject[],
): Promise<number> {
  const planned = planFlags(raw, subjects);

  // Stamped even when nothing was found, so a clean document isn't re-scanned
  // (and re-billed) every time the catch-up button is pressed.
  await supabase
    .from("documents")
    .update({ flags_scanned_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("project_id", projectId);

  if (planned.length === 0) return 0;

  const { data, error } = await supabase
    .from("document_flags")
    .upsert(
      planned.map((flag) => ({ ...flag, project_id: projectId, document_id: documentId })),
      {
        onConflict: "document_id,target_table,target_id,target_field",
        ignoreDuplicates: true,
      },
    )
    .select("id");

  if (error) {
    console.error("Failed to store document flags:", error.message);
    return 0;
  }

  return data?.length ?? 0;
}
