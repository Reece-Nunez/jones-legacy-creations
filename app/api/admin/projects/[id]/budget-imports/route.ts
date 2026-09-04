import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { applyBudgetSync } from "@/lib/finance/apply-budget-sync";

/**
 * Budgets read off uploaded documents, waiting to be applied.
 *
 * Applying replaces the project's entire budget, so a parsed budget is parked
 * on the document (documents.parsed_budget) and only written once someone has
 * looked at it. The lines come back from the client rather than being read
 * from the row, so dropping or correcting a misread line in the preview is
 * what actually gets saved.
 */

/** Documents holding a parsed budget that hasn't been applied or dismissed. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("documents")
    .select("id, name, file_url, parsed_budget, created_at")
    .eq("project_id", id)
    .not("parsed_budget", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/** Apply the approved lines as the project's budget. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const documentId: string | null =
    typeof body?.document_id === "string" ? body.document_id : null;

  if (!documentId) {
    return NextResponse.json({ error: "document_id is required" }, { status: 400 });
  }
  if (!Array.isArray(body?.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: "Select at least one line to import" }, { status: 400 });
  }

  // Confirm the document belongs to this project before touching the budget —
  // the document id arrives from the client.
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("project_id", id)
    .maybeSingle();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json({ error: "Document not found on this project" }, { status: 404 });
  }

  // Every imported line is new: this is a replace, so nothing carries an id.
  const result = await applyBudgetSync(
    supabase,
    id,
    body.lines.map((line: { line_number?: unknown; description?: unknown; amount?: unknown }) => ({
      id: null,
      line_number: line.line_number,
      description: line.description,
      budgeted_amount: line.amount,
    })),
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Clearing the parked copy is what takes the card off the review panel.
  await supabase
    .from("documents")
    .update({ parsed_budget: null })
    .eq("id", documentId)
    .eq("project_id", id);

  await supabase.from("activity_log").insert({
    project_id: id,
    action: "budget_imported",
    description: `Budget imported from a document — ${result.inserted} line${result.inserted !== 1 ? "s" : ""} added, ${result.deleted} replaced`,
  });

  return NextResponse.json({ success: true, ...result });
}

/** Dismiss a parsed budget without applying it. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const documentId = request.nextUrl.searchParams.get("document_id");
  if (!documentId) {
    return NextResponse.json({ error: "document_id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("documents")
    .update({ parsed_budget: null })
    .eq("id", documentId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
