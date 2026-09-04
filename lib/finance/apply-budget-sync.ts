import type { SupabaseClient } from "@supabase/supabase-js";
import { planBudgetSync, BudgetSyncError, type BudgetSyncItem } from "./budget-sync";

/**
 * Write a full budget list over a project's existing line items.
 *
 * Shared by the Budget tab's save and by applying a budget read off an
 * uploaded document. Both replace the whole list, and both have to handle the
 * same two traps — renumbering a line orphans the spend charged to it, and a
 * renumbered row cannot be upserted by (project_id, line_number) — so the
 * sequence lives here rather than being written twice.
 */

export type ApplyBudgetResult =
  | { ok: true; deleted: number; updated: number; inserted: number }
  | { ok: false; status: 400 | 500; error: string };

export async function applyBudgetSync(
  supabase: SupabaseClient,
  projectId: string,
  items: BudgetSyncItem[],
): Promise<ApplyBudgetResult> {
  const { data: existing, error: readError } = await supabase
    .from("budget_line_items")
    .select("id, line_number")
    .eq("project_id", projectId);

  if (readError) return { ok: false, status: 500, error: readError.message };

  let plan;
  try {
    plan = planBudgetSync(existing ?? [], items);
  } catch (e) {
    if (e instanceof BudgetSyncError) return { ok: false, status: 400, error: e.message };
    throw e;
  }

  // Deletes run first: a renumbered row can legitimately take the line number
  // of a row being removed in the same save, and (project_id, line_number) is
  // unique, so doing it the other way round collides.
  if (plan.deleteIds.length > 0) {
    const { error } = await supabase
      .from("budget_line_items")
      .delete()
      .eq("project_id", projectId)
      .in("id", plan.deleteIds);
    if (error) return { ok: false, status: 400, error: error.message };
  }

  // Spend is matched to a budget line by line_number, not by foreign key, so
  // renumbering a line silently orphans everything charged to it unless the
  // pointers move too.
  for (const rename of plan.renames) {
    await supabase
      .from("contractor_payments")
      .update({ budget_line_number: rename.to })
      .eq("project_id", projectId)
      .eq("budget_line_number", rename.from);
    await supabase
      .from("documents")
      .update({ line_item_number: rename.to })
      .eq("project_id", projectId)
      .eq("line_item_number", rename.from);
  }

  // Existing rows are updated by primary key, not upserted. An upsert keyed on
  // (project_id, line_number) finds no conflict for a row whose number just
  // changed, tries to INSERT, and collides on the id it already has.
  let updated = 0;
  for (const row of plan.upserts) {
    if (!row.id) continue;
    const { id: rowId, ...values } = row;
    const { error } = await supabase
      .from("budget_line_items")
      .update(values)
      .eq("id", rowId)
      .eq("project_id", projectId);
    if (error) return { ok: false, status: 400, error: error.message };
    updated += 1;
  }

  const newRows = plan.upserts.filter((row) => !row.id);
  if (newRows.length > 0) {
    const { error } = await supabase
      .from("budget_line_items")
      .insert(newRows.map((row) => ({ ...row, project_id: projectId })));
    if (error) return { ok: false, status: 400, error: error.message };
  }

  return {
    ok: true,
    deleted: plan.deleteIds.length,
    updated,
    inserted: newRows.length,
  };
}
